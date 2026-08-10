const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function bingSearchM1() {
  console.log("==================================================");
  console.log("🔍 BING IMAGE SEARCH FOR MASLA 1 (TYPE MISMATCHES)");
  console.log("==================================================");

  const db = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});

  const [productsToFix] = await db.query(
    `SELECT id, name, category, brand, image FROM products 
     WHERE (name LIKE '%floor standing%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') 
     AND (image IS NULL OR image LIKE '/images/cat_%' OR image LIKE '%product_fridge%' OR image LIKE '%product_washer%')
     LIMIT 10`
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
    
    // Add specific keywords to ensure Bing fetches the correct physical type
    let typeKeyword = '';
    if(p.name.toLowerCase().includes('floor standing') || p.name.toLowerCase().includes('cabinet')) typeKeyword = 'floor standing AC';
    if(p.name.toLowerCase().includes('front load')) typeKeyword = 'front load washing machine';
    if(p.name.toLowerCase().includes('side by side')) typeKeyword = 'side by side refrigerator';
    if(p.name.toLowerCase().includes('chest')) typeKeyword = 'chest freezer';
    if(p.name.toLowerCase().includes('upright')) typeKeyword = 'upright freezer';
    
    const searchQuery = `${p.brand} ${cleanName} ${typeKeyword} white background png`;
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`;

    console.log(`[${idx+1}/${productsToFix.length}] Searching Bing Images for: "${searchQuery}" ...`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      await delay(2000); // Wait 2s to load and avoid limits

      const matchedImgUrl = await page.evaluate(() => {
        const mElements = document.querySelectorAll('a.iusc, div[m]');
        for (const el of mElements) {
          const mAttr = el.getAttribute('m');
          if (mAttr) {
            try {
              const mData = JSON.parse(mAttr);
              if (mData.murl && mData.murl.startsWith('http') && !mData.murl.includes('bing.com')) {
                return mData.murl;
              }
            } catch (e) {}
          }
        }
        return null;
      });

      if (matchedImgUrl) {
        const slug = `${p.brand}-${cleanName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const localFilename = `m1_${p.id}_${slug}.jpg`;
        const localAbsPath = path.join(imagesOutputDir, localFilename);
        const relativeWebPath = `/images/products/${localFilename}`;

        const tempRaw = path.join(imagesOutputDir, `temp_b_${slug}.jpg`);
        const client = matchedImgUrl.startsWith('https') ? https : http;

        await new Promise((res) => {
          const req = client.get(matchedImgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
            if (resp.statusCode === 200 || resp.statusCode === 301 || resp.statusCode === 302) {
                let actualUrl = matchedImgUrl;
                if(resp.statusCode === 301 || resp.statusCode === 302) actualUrl = resp.headers.location;
                const req2 = (actualUrl.startsWith('https') ? https : http).get(actualUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp2) => {
                    if (resp2.statusCode !== 200) return res();
                    const f = fs.createWriteStream(tempRaw);
                    resp2.pipe(f);
                    f.on('finish', () => { f.close(); res(); });
                });
                req2.on('error', () => res());
                req2.setTimeout(8000, () => { req2.destroy(); res(); });
            } else {
                return res();
            }
          });
          req.on('error', () => res());
          req.setTimeout(8000, () => { req.destroy(); res(); });
        });

        if (fs.existsSync(tempRaw) && fs.statSync(tempRaw).size > 1000) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 92 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRaw);
          await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeWebPath, p.id]);
          updatedCount++;
          console.log(`   ✅ [ID ${p.id}] Updated -> ${relativeWebPath}`);
        } else {
          if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
          console.log(`   ❌ [ID ${p.id}] Downloaded image too small/invalid.`);
        }
      } else {
        console.log(`   ❌ [ID ${p.id}] No image URL found on Bing.`);
      }

    } catch (e) {
      console.log(`   ❌ [ID ${p.id}] Search error: ${e.message}`);
    }
    
    await delay(3000); // 3 seconds delay between items
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(`✅ BING IMAGE SEARCH COMPLETE: Updated ${updatedCount} products with unique real model images!`);
  console.log("==================================================");

  await db.end();
  process.exit(0);
}

bingSearchM1().catch(console.error);
