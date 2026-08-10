const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.abort(); reject(new Error('Timeout')); });
  });
}

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query("SELECT id, name, category, image FROM products WHERE (name LIKE '%floor standing%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') AND (image IS NULL OR image LIKE '%product_fridge%' OR image LIKE '%product_washer%') LIMIT 20");
  
  let fixedCount = 0;
  for(const row of rows) {
    console.log(`Fixing M1: ${row.name}`);
    const query = `${row.name} product photo`;
    
    try {
      const output = execSync(`python image_search.py "${query}" 2>NUL`).toString();
      const jsonStart = output.indexOf('[');
      const jsonEnd = output.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = output.substring(jsonStart, jsonEnd + 1);
        const results = JSON.parse(jsonStr);
        
        for (const res of results) {
          const imgUrl = res.image;
          console.log(`Found URL: ${imgUrl}`);
          const ext = imgUrl.split('.').pop().split('?')[0].toLowerCase();
          const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
          const filename = `m1_${row.id}_${Date.now()}.${safeExt}`;
          const dest = path.join('E:', 'earthyelectronics', 'frontend', 'public', 'images', 'products', filename);
          
          try {
            await downloadImage(imgUrl, dest);
            // Verify it's a real image and > 0 bytes
            if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
                const dbPath = `/images/products/${filename}`;
                await c.query('UPDATE products SET image = ? WHERE id = ?', [dbPath, row.id]);
                console.log(`✅ Fixed: ${dbPath}`);
                fixedCount++;
                break; // move to next product
            } else {
                console.log(`❌ Invalid image file downloaded.`);
            }
          } catch(err) {
            console.log(`Download failed for ${imgUrl}: ${err.message}`);
          }
        }
      }
    } catch (e) {
      console.log('Error fetching image:', e.message);
    }
  }
  
  console.log(`Done! Fixed ${fixedCount}/20 items.`);
  await c.end();
}
run().catch(console.error);
