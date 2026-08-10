const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

async function verifyImageVisual(buffer) {
  try {
    const prompt = "Analyze this image. Does this image genuinely show a photograph of an electronics home appliance (e.g. AC, Fridge, Washing Machine, Microwave, TV, Dispenser, Heater, etc.)? If the image is a drawing, a cartoon, an infographic, a random object like a plant or animal, a single letter/number graphic, Arabic calligraphy, or anything other than a real physical appliance, you MUST say NO. Reply with EXACTLY 'YES' or 'NO' and nothing else.";
    
    const imageParts = [{
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "image/jpeg"
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text().trim().toUpperCase();
    return text.includes("YES");
  } catch(e) {
    console.error("  [Vision AI Error]:", e.message);
    return false;
  }
}

const productId = process.argv[2];
const productName = process.argv[3];
const productCategory = process.argv[4] || '';
const productBrand = process.argv[5] || '';

if (!productId || !productName) {
  console.error('Usage: node google_search_m5.cjs <id> "<name>" ["<category>"] ["<brand>"]');
  process.exit(1);
}

const imagesDir = path.join(__dirname, '../frontend/public/images/products');
const hashFile = path.join(__dirname, 'used_image_hashes.json');

function calculateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function loadHashes() {
  if (fs.existsSync(hashFile)) {
    return new Set(JSON.parse(fs.readFileSync(hashFile, 'utf8')));
  }
  return new Set();
}

function saveHashes(hashes) {
  fs.writeFileSync(hashFile, JSON.stringify(Array.from(hashes), null, 2));
}

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', err => reject(err));
  });
};

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const updateDatabase = async (id, imagePath) => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'earthy_elec' });
  await c.query('UPDATE products SET image = ? WHERE id = ?', [imagePath, id]);
  await c.end();
};

function verifyTitle(title, name, brand) {
  if (!title) return false;
  title = title.toLowerCase();
  brand = brand.toLowerCase();
  name = name.toLowerCase();
  
  // Brand must be present in title
  if (brand && !title.includes(brand)) return false;
  
  // Extract numbers/model from name
  const nameWords = name.split(/[\s-]+/);
  // Find words that have digits (likely model numbers, e.g. "HRF-336" -> "336", "1.5")
  const modelParts = nameWords.filter(w => /\d/.test(w) && w.length > 1);
  
  // If we found model numbers, at least one of them must be in the title
  if (modelParts.length > 0) {
    const hasModelMatch = modelParts.some(part => title.includes(part));
    if (!hasModelMatch) return false;
  }
  
  return true;
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const hashes = loadHashes();
  
  try {
    const searchTerms = [
      productName,
      'official product photo'
    ].filter(Boolean).join(' ');

    const queriesToTry = [
      { q: searchTerms, engine: 'google' },
      { q: productName + ' site:pak-electronics.pk', engine: 'bing' },
      { q: productName + ' site:qistbazaar.pk', engine: 'bing' },
      { q: productName + ' site:daraz.pk', engine: 'bing' }
    ];

    let success = false;

    for (const query of queriesToTry) {
      if (success) break;
      
      console.log(`[ID ${productId}] Searching for: "${query.q}"`);
      
      let url = '';
      if (query.engine === 'google') {
        url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query.q)}`;
      } else {
        url = `https://www.bing.com/images/search?q=${encodeURIComponent(query.q)}&FORM=HDRSC3`;
      }
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      let elements = [];
      if (query.engine === 'google') {
        // Google Image results container
        // Each result is in an 'isv-r' or similar div, containing image and title
        elements = await page.$$('div.isv-r, div.h312pd');
      } else {
        elements = await page.$$('.mimg');
      }
      
      let attempts = 0;
      
      for (const el of elements) {
        if (attempts >= 10) break;
        attempts++;
        
        try {
          let src = '';
          let title = '';
          
          if (query.engine === 'google') {
            const imgEl = await el.$('img');
            if (imgEl) src = await imgEl.evaluate(n => n.src || n.getAttribute('data-src'));
            
            // Get title from text below image or alt tag
            const titleEl = await el.$('h3, a.VFACy');
            if (titleEl) title = await titleEl.evaluate(n => n.innerText || n.getAttribute('title'));
            if (!title && imgEl) title = await imgEl.evaluate(n => n.alt);
          } else {
            src = await el.evaluate(n => n.src || n.getAttribute('data-src'));
            title = await el.evaluate(n => n.alt); // Bing puts title in alt
          }
          
          if (!src || !src.startsWith('http')) continue;
          
          // Verify Title (Rule 1)
          if (!verifyTitle(title, productName, productBrand)) {
            console.log(`  [REJECTED] Title "${title}" did not match model verification.`);
            continue;
          }
          
          // Download and Hash (Rule 2)
          if (src.includes('?')) {
            src = src.split('&').filter(p => !p.startsWith('w=') && !p.startsWith('h=') && !p.startsWith('pid=')).join('&');
          }
          
          const buffer = await downloadImage(src);
          const md5 = calculateMD5(buffer);
          
          if (hashes.has(md5)) {
            console.log(`  [DUPLICATE] Image hash matches an existing image on site. Skipping...`);
            continue;
          }
          
          // Verify visually
          const isAppliance = await verifyImageVisual(buffer);
          if (!isAppliance) {
            console.log(`  [REJECTED AI] Vision AI determined this is not a real appliance photo.`);
            continue;
          }
          
          // It's unique! Save it.
          const filename = `m5_${productId}_${slugify(productName)}.jpg`;
          const dest = path.join(imagesDir, filename);
          fs.writeFileSync(dest, buffer);
          
          hashes.add(md5);
          saveHashes(hashes);
          
          await updateDatabase(productId, `/images/products/${filename}`);
          console.log(`   ✅ [ID ${productId}] Updated -> /images/products/${filename}`);
          success = true;
          break;
        } catch(e) {
          // ignore error for single image and continue
        }
      }
    }
    
    if (!success) {
      console.log(`   ❌ [ID ${productId}] Failed to find unique real image after trying all queries.`);
    }

  } catch (err) {
    console.error(`Error processing ID ${productId}:`, err.message);
  } finally {
    await browser.close();
  }
}

run();
