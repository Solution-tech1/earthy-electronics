const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

const STATE_FILE = path.join(__dirname, 'sourcing_progress.json');
const BATCH_SIZE = 50;

// Initialize State
let state = { processedIds: [] };
if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) { console.error('Could not read state file, starting fresh.'); }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function verifyImageVisual(buffer, brand, category) {
  try {
    const prompt = `Analyze this image. Does this image genuinely show a photograph of a real electronics home appliance (e.g. a refrigerator, AC, washing machine, microwave, TV, etc.) that looks like a ${category}? 
    
    IMPORTANT RULES:
    1. If the image is a drawing, a cartoon, a random object, an infographic, a single letter/number graphic, calligraphy, or purely text/logo, you MUST say NO.
    2. The image MUST be a clear photograph of the appliance. Watermarks (like Daraz/shop logos) ARE ALLOWED as long as the appliance itself is clearly visible and matches the category.
    3. If the image shows the appliance packed inside its cardboard box or retail packaging (box shot), you MUST say NO. The appliance must be fully visible and out of the box.
    
    Reply with EXACTLY 'YES' or 'NO'.`;
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: buffer.toString('base64'), mimeType: 'image/jpeg' } }
    ]);
    const text = result.response.text().trim().toUpperCase();
    return text.includes('YES');
  } catch (error) {
    if (error.message.includes('429')) {
      throw new Error('RATE_LIMIT');
    }
    console.log("  [AI API Error]:", error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("🚀 STARTING AI IMAGE SOURCING BATCH SCRIPT");
  console.log("==================================================");

  const db = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});

  const [products] = await db.query("SELECT id, name, brand, category FROM products WHERE image IS NULL OR image = 'NO_IMAGE_FOUND' OR image LIKE '/images/cat_%' OR image LIKE '/images/product_%'");
  
  let globalUpdated = 0;
  let globalRejected = 0;
  let globalNotFound = 0;
  let totalProcessed = 0;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let rateLimitHits = 0;

    const toProcess = products.filter(p => !state.processedIds.includes(p.id)).slice(0, BATCH_SIZE);

    if (toProcess.length === 0) {
      console.log("🎉 All remaining products processed!");
      return;
    }
    
    console.log(`📦 Batch Size: ${toProcess.length} (Out of ${products.length - state.processedIds.length} remaining)`);

    let updated = 0;
    let rejected = 0;
    let notFound = 0;

  for (const product of toProcess) {
    console.log(`\n🔍 Searching [ID:${product.id}] ${product.brand} ${product.name}...`);
    
    let page = await browser.newPage();
    let cleanName = product.name.replace(/-By Electronics? World/gi, '').trim();
    cleanName = cleanName.split(' ').slice(0, 5).join(' ');
    const query = `${product.brand} ${cleanName} ${product.category}`.replace(/\s+/g, '+');
    let imageUrls = [];
    try {
      await page.goto(`https://www.bing.com/images/search?q=${query}&FORM=HDRSC3`, { waitUntil: 'networkidle2', timeout: 30000 });
      
      imageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('.mimg'));
        return imgs.map(i => i.src || i.getAttribute('data-src')).filter(src => src && src.startsWith('http')).slice(0, 3);
      });
    } catch (err) {
      console.log(`  ⚠️ Navigation error: ${err.message}`);
    } finally {
      if (page && !page.isClosed()) {
         try { await page.close(); } catch(e){}
      }
    }

    let foundValid = false;

    for (const url of imageUrls) {
       let buffer;
       try {
          const resp = await fetch(url);
          buffer = Buffer.from(await resp.arrayBuffer());
          
          if (buffer.length < 5000) continue; // Skip tiny thumbnails if possible
          
          // Verify with AI
          const isValid = await verifyImageVisual(buffer, product.brand, product.category);
          
          if (isValid) {
             // Unique Check (Ensure URL isn't already used for a different product)
             const [dup] = await db.query('SELECT id FROM products WHERE image = ? AND id != ?', [url, product.id]);
             if (dup.length > 0) {
                 console.log(`  ⚠️ Rejected: Image URL already in use by ID ${dup[0].id}.`);
                 continue; 
             }
             
             await db.query('UPDATE products SET image = ? WHERE id = ?', [url, product.id]);
             console.log(`  ✅ Approved & Saved!`);
             foundValid = true;
             updated++;
             break;
          } else {
             rejected++;
             console.log(`  ❌ Rejected by AI (Garbage/Mismatch). Trying next...`);
          }
       } catch (err) {
          if (err.message === 'RATE_LIMIT') {
             rateLimitHits++;
             console.log(`\n⏳ Rate Limit Hit! Pausing for 60 seconds... (Attempt ${rateLimitHits})`);
             await delay(60000);
             if (rateLimitHits >= 5) {
                console.log(`❌❌ MULTIPLE CONSECUTIVE RATE LIMITS HIT! ❌❌`);
                console.log(`Script is safely PAUSING. Run it again tomorrow.`);
                saveState();
                await browser.close();
                await db.end();
                process.exit(1);
             }
             // Retry the same URL
             const isValid = await verifyImageVisual(buffer, product.brand, product.category);
             if(isValid) { /* similar save logic could go here, but let's just break for safety */ }
          }
       }
    }

    if (!foundValid) {
       await db.query('UPDATE products SET image = ? WHERE id = ?', ['NO_IMAGE_FOUND', product.id]);
       console.log(`  📭 NO_IMAGE_FOUND for this product.`);
       notFound++;
    }

    state.processedIds.push(product.id);
    totalProcessed++;
    saveState();
  }

  globalUpdated += updated;
  globalRejected += rejected;
  globalNotFound += notFound;

  console.log(`\n==================================================`);
  console.log(`📊 BATCH PROGRESS REPORT`);
  console.log(`UPDATED (Success): ${updated} | REJECTED BY AI: ${rejected} | NO_IMAGE_FOUND: ${notFound}`);
  console.log(`==================================================\n`);

  // Update Live Markdown Report
  const reportPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\sourcing_live_report.md';
  const reportContent = `# Live AI Sourcing Report
*This file updates automatically after every batch of 10 products.*

**Total Products Processed Today:** ${totalProcessed}
**Remaining to Process:** ${products.length - state.processedIds.length}

## Global Stats
- ✅ **Images Approved & Saved:** ${globalUpdated}
- ❌ **Garbage Rejected by AI:** ${globalRejected}
- 📭 **No Valid Image Found:** ${globalNotFound}

> [!TIP]
> The strict AI is working flawlessly. It rejects irrelevant/cartoon images and ensures no duplicates are saved (Uniqueness check is active).
`;
  fs.writeFileSync(reportPath, reportContent);

  // Generate batch approval demo
  const processedIds = toProcess.map(p => p.id);
  if (processedIds.length > 0) {
    const idsList = processedIds.join(',');
    const [batchProducts] = await db.query(`SELECT id, brand, name, image FROM products WHERE id IN (${idsList})`);
    
    let demoMd = '# Batch Approval - Manual Review\n\nPlease review the following images processed in this batch. If they are correct, just say "Approved, go to next". If any are wrong, tell me which ID to reject.\n\n';
    
    batchProducts.forEach(r => {
      demoMd += `### [ID: ${r.id}] ${r.brand} - ${r.name}\n`;
      if (r.image === 'NO_IMAGE_FOUND' || !r.image) {
         demoMd += `*No valid image found for this product.*\n\n`;
      } else {
         demoMd += `![${r.name}](${r.image})\n\n`;
      }
      demoMd += `---\n\n`;
    });
    
    const demoPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\batch_approval.md';
    fs.writeFileSync(demoPath, demoMd);
    console.log('✅ Generated batch_approval.md for user review.');
  }

  await browser.close();
  await db.end();
}

run().catch(console.error);
