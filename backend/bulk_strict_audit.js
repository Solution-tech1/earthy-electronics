const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use gemini-3.1-flash-lite as it is fast and has a free tier
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

const STATE_FILE = path.join(__dirname, 'audit_progress.json');
const IMAGES_DIR = path.join(__dirname, '../frontend/public/images/products');

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { processedIds: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function verifyImageWithAI(imagePath, product) {
  try {
    const buffer = fs.readFileSync(imagePath);
    
    // Strict prompt to ensure it's a real electronics appliance and matches the brand/type
    const prompt = `Analyze this image. 
Rule 1: Does this image genuinely show a photograph of an electronics home appliance? If it is a drawing, a cartoon, an infographic, a random object (like a plant, animal, car, bus), a logo only, or anything other than a real physical appliance, you MUST say NO.
Rule 2: Does the appliance in the photo reasonably match a "${product.brand} ${product.category}"?
If BOTH rules pass, reply with EXACTLY 'YES'. Otherwise, reply with EXACTLY 'NO'. Reply with nothing else.`;
    
    const imageParts = [{
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "image/jpeg" // Assuming jpeg, Gemini accepts general images
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text().trim().toUpperCase();
    return { success: true, isApproved: text.includes("YES") };
  } catch(e) {
    console.error(`\n  [AI API Error]: ${e.message}`);
    // Check if it's a rate limit error (429)
    if (e.message.includes('429') || e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('exhausted')) {
      return { success: false, errorType: 'RATE_LIMIT' };
    }
    return { success: false, errorType: 'UNKNOWN', error: e.message };
  }
}

async function run() {
  console.log("==================================================");
  console.log("🚀 STARTING STRICT BULK AUDIT (FREE-TIER SAFE)");
  console.log("==================================================");

  const db = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  let state = loadState();

  // 1. DELETE LITERAL DUPLICATES FIRST (Exact same name & category)
  // We keep the lowest ID. This spares legitimate variants since they have different names (e.g. 1 Ton vs 1.5 Ton)
  console.log("🧹 Cleaning literal duplicates from database...");
  await db.query(`
    DELETE p1 FROM products p1
    INNER JOIN products p2 
    WHERE p1.id > p2.id AND p1.name = p2.name AND p1.category = p2.category
  `);
  console.log("✅ Literal duplicates removed.");

  // 2. Fetch all remaining products
  // We ONLY fetch products that currently DO NOT have a valid image on the site, to protect live products.
  const [products] = await db.query("SELECT id, name, brand, category, image FROM products WHERE image IS NULL OR image = 'NO_IMAGE_FOUND' OR image LIKE '/images/cat_%' ORDER BY id ASC");
  console.log(`📦 Total Hidden Products to Audit: ${products.length}`);
  console.log(`🔄 Previously Processed: ${state.processedIds.length}`);

  let consecutiveRateLimits = 0;

  for (const product of products) {
    if (state.processedIds.includes(product.id)) continue;

    process.stdout.write(`Auditing [ID:${product.id}] ${product.name.substring(0,30)}... `);

    // Find if we have a physical image for this product
    // It could be in DB (if it was confirmed earlier) OR sitting unlinked in the folder (m5_...)
    let imageFileToAudit = null;
    let isAlreadyInDb = false;

    if (product.image && product.image.startsWith('/images/products/') && !product.image.includes('cat_')) {
       const possiblePath = path.join(__dirname, '../frontend/public', product.image);
       if (fs.existsSync(possiblePath)) {
         imageFileToAudit = possiblePath;
         isAlreadyInDb = true;
       }
    } 

    if (!imageFileToAudit) {
      // Search the folder for an m5_ file for this ID
      const prefix = `m5_${product.id}_`;
      const files = fs.readdirSync(IMAGES_DIR);
      const matchedFile = files.find(f => f.startsWith(prefix));
      if (matchedFile) {
        imageFileToAudit = path.join(IMAGES_DIR, matchedFile);
      }
    }

    if (!imageFileToAudit) {
      console.log("No image found.");
      state.processedIds.push(product.id);
      saveState(state);
      continue; // Nothing to audit
    }

    // Run AI Vision Verification
    let aiResult = await verifyImageWithAI(imageFileToAudit, product);

    // Handle Rate Limits (Free Tier Safe Logic)
    while (!aiResult.success && aiResult.errorType === 'RATE_LIMIT') {
      consecutiveRateLimits++;
      console.log(`\n⏳ Rate Limit Hit! Pausing for 60 seconds... (Attempt ${consecutiveRateLimits})`);
      await delay(60000); // Wait 1 minute
      
      if (consecutiveRateLimits >= 5) {
        console.error("\n❌❌ MULTIPLE CONSECUTIVE RATE LIMITS HIT! ❌❌");
        console.error("This means your DAILY Quota (1,500 requests) has likely been exhausted.");
        console.error("Script is safely PAUSING. Run it again tomorrow, it will resume exactly from here.");
        await db.end();
        process.exit(1);
      }
      
      console.log(`🔄 Retrying [ID:${product.id}]...`);
      aiResult = await verifyImageWithAI(imageFileToAudit, product);
    }

    // Reset consecutive limit counter on success
    if (aiResult.success) {
      consecutiveRateLimits = 0;
    }

    if (aiResult.success) {
      if (aiResult.isApproved) {
        console.log("✅ APPROVED by AI (Preview Mode).");
        // Save to preview JSON instead of DB
        let preview = [];
        if (fs.existsSync('audit_preview.json')) {
          preview = JSON.parse(fs.readFileSync('audit_preview.json', 'utf8'));
        }
        preview.push({ id: product.id, brand: product.brand, name: product.name, image: '/images/products/' + path.basename(imageFileToAudit) });
        fs.writeFileSync('audit_preview.json', JSON.stringify(preview, null, 2));
      } else {
        console.log("❌ REJECTED by AI (Garbage/Mismatch). Deleting...");
        try { fs.unlinkSync(imageFileToAudit); } catch(e) {}
      }
    } else {
      console.log(`⚠️ Skipped due to unknown error.`);
    }

    // Save Progress
    state.processedIds.push(product.id);
    saveState(state);

    // Rate Limit Safety Delay: 4 seconds between requests (~15 Requests Per Minute max for Free Tier)
    await delay(4000);
  }

  console.log("\n🎉🎉 AUDIT COMPLETE! All products processed successfully.");
  await db.end();
}

run().catch(console.error);
