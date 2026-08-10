const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const mysql = require('mysql2/promise');

const productId = process.argv[2];
const productName = process.argv[3];
const productCategory = process.argv[4] || '';

if (!productId || !productName) {
  console.error('Usage: node bing_search_m5.cjs <id> "<name>" ["<category>"]');
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

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const hashes = loadHashes();
  
  try {
    // Generate base query
    // E.g., "Dawlance 1.5 Ton Split AC white background png"
    const searchTerms = [
      productName,
      productCategory !== 'All' ? productCategory : '',
      'white background',
      'png'
    ].filter(Boolean).join(' ');

    const queriesToTry = [
      searchTerms,
      searchTerms + ' site:pak-electronics.pk',
      searchTerms + ' site:qistbazaar.pk',
      searchTerms + ' site:daraz.pk'
    ];

    let success = false;

    for (const q of queriesToTry) {
      if (success) break;
      
      console.log(`[ID ${productId}] Searching for: "${q}"`);
      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&FORM=HDRSC3`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const elements = await page.$$('.mimg');
      let attempts = 0;
      
      for (const el of elements) {
        if (attempts >= 8) break; // Check up to 8 images per query
        attempts++;
        
        try {
          let src = await el.evaluate(n => n.src || n.getAttribute('data-src'));
          if (src && src.startsWith('http')) {
            // Some Bing images are tiny thumbnails, remove &w= and &h= to get original
            if (src.includes('?')) {
              src = src.split('&').filter(p => !p.startsWith('w=') && !p.startsWith('h=') && !p.startsWith('pid=')).join('&');
            }
            
            const buffer = await downloadImage(src);
            const md5 = calculateMD5(buffer);
            
            // Check for duplicates
            if (hashes.has(md5)) {
              console.log(`  [DUPLICATE] Image hash matches an existing image on site. Skipping...`);
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
          }
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
