const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function googleBulletproof() {
  console.log("==================================================");
  console.log("🔍 BULLETPROOF GOOGLE IMAGE FETCH FOR DISPENSERS & WASHING MACHINES");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [productsToFix] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE image IN ('/images/product_dispenser.png', '/images/cat_washer.png') 
        OR image LIKE '%faysalbank.com%'`
  );

  console.log(`Found ${productsToFix.length} products requiring unique real images...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  let updatedCount = 0;

  for (let idx = 0; idx < productsToFix.length; idx++) {
    const p = productsToFix[idx];
    let cleanName = p.name.replace(/^Haier\s+/i, '').replace(/^Dawlance\s+/i, '').replace(/^Samsung\s+/i, '').replace(/^Orient\s+/i, '').replace(/^PEL\s+/i, '').trim();
    const searchQuery = `${p.brand} ${cleanName}`;
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;

    console.log(`[${idx+1}/${productsToFix.length}] Google searching: "${p.brand} ${cleanName}" ...`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      await delay(1500);

      // Scroll slightly
      await page.evaluate(() => window.scrollBy(0, 300));
      await delay(1000);

      const allImageSrcs = await page.evaluate(() => {
        const arr = [];
        document.querySelectorAll('img').forEach(img => {
          const s = img.src || img.getAttribute('data-src') || img.getAttribute('data-iurl');
          if (s && (s.startsWith('data:image/') || s.startsWith('http')) && !s.includes('google.com/images/branding') && !s.includes('logo')) {
            arr.push(s);
          }
        });
        return arr;
      });

      let selectedSrc = allImageSrcs.length > 0 ? allImageSrcs[0] : null;

      if (selectedSrc) {
        const slug = `${p.brand}-${cleanName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const localFilename = `${slug}.jpg`;
        const localAbsPath = path.join(imagesOutputDir, localFilename);
        const relativeWebPath = `/images/products/${localFilename}`;

        if (selectedSrc.startsWith('data:image/')) {
          const base64Data = selectedSrc.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (buffer.length > 500) {
            await sharp(buffer)
              .flatten({ background: { r: 255, g: 255, b: 255 } })
              .jpeg({ quality: 92 })
              .toFile(localAbsPath);

            await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
            updatedCount++;
            console.log(`   ✅ [ID ${p.id}] Updated -> ${relativeWebPath}`);
          }

        } else if (selectedSrc.startsWith('http')) {
          const tempRaw = path.join(imagesOutputDir, `temp_bp_${slug}.jpg`);
          const client = selectedSrc.startsWith('https') ? https : http;

          await new Promise((res) => {
            const req = client.get(selectedSrc, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
              if (resp.statusCode !== 200) return res();
              const f = fs.createWriteStream(tempRaw);
              resp.pipe(f);
              f.on('finish', () => { f.close(); res(); });
            });
            req.on('error', () => res());
            req.setTimeout(8000, () => { req.destroy(); res(); });
          });

          if (fs.existsSync(tempRaw) && fs.statSync(tempRaw).size > 500) {
            await sharp(tempRaw)
              .flatten({ background: { r: 255, g: 255, b: 255 } })
              .jpeg({ quality: 92 })
              .toFile(localAbsPath);

            fs.unlinkSync(tempRaw);
            await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
            updatedCount++;
            console.log(`   ✅ [ID ${p.id}] Updated -> ${relativeWebPath}`);
          }
        }
      } else {
        console.log(`   ❌ [ID ${p.id}] No image extracted.`);
      }

    } catch (e) {
      console.log(`   ❌ [ID ${p.id}] Search error: ${e.message}`);
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(`✅ GOOGLE BULLETPROOF COMPLETE: Updated ${updatedCount} products!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

googleBulletproof().catch(console.error);
