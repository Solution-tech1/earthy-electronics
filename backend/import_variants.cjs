const fs = require('fs');
const https = require('https');
const xlsx = require('xlsx');
const path = require('path');
const mysql = require('mysql2/promise');

const outDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'models');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath)).on('finish', () => resolve(true));
      } else {
        console.error('Failed to download', url, 'Status:', res.statusCode);
        resolve(false);
      }
    }).on('error', (e) => {
      console.error('Error downloading', url, e);
      resolve(false);
    });
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
}

async function processFile(db, filePath, categoryName) {
  console.log(`Processing ${filePath}...`);
  try {
    const wb = xlsx.readFile(filePath);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    // Group by exact image string to generate a shared group_id
    const grouped = {};
    for (let row of data) {
      if (!row.images) continue;
      const imgKey = row.images.trim();
      if (!grouped[imgKey]) {
        grouped[imgKey] = [];
      }
      grouped[imgKey].push(row);
    }
    
    let groupIdCounter = Date.now(); // Simple unique ID generator
    
    for (let key in grouped) {
      const group = grouped[key];
      const groupId = `grp_${groupIdCounter++}`;
      
      const firstUrl = key.split('|')[0].trim();
      const ext = '.jpg';
      
      // Determine base name for the image file from the first product
      const baseBrand = group[0].Brand || 'Unknown';
      const baseName = group[0].name || 'Unknown Model';
      const filename = sanitizeFilename(baseBrand + '_' + baseName) + ext;
      const fullPath = path.join(outDir, filename);
      
      let success = true;
      if (!fs.existsSync(fullPath)) {
        success = await downloadImage(firstUrl, fullPath);
      }
      const dbImagePath = success ? `/images/models/${filename}` : '';
      
      // Insert EACH product individually, but with the same group_id
      for (let item of group) {
        const brand = item.Brand || 'Unknown';
        const name = item.name || 'Unknown Model';
        const price = item['Variant Price'] || 0;
        const desc = item.description || item['Short description'] || '';
        
        const query = `
          INSERT INTO products (name, brand, category, price, discountPrice, image, description, specifications, group_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          name,
          brand,
          categoryName,
          price,
          null,
          dbImagePath,
          desc,
          null,
          group.length > 1 ? groupId : null // Only set group_id if there are variants
        ];
        
        await db.query(query, values);
        console.log(`Inserted ${name} (Group: ${group.length > 1 ? groupId : 'None'})`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'earthyelectronics'
  });
  
  await processFile(db, 'E:\\earthyelectronics\\backend\\all products files\\LED UPLOADING.xlsx', 'LED TVs');
  await processFile(db, 'E:\\earthyelectronics\\backend\\all products files\\water dispenser.xlsx', 'Water Dispensers');
  
  await db.end();
  console.log('Finished importing individual products with group_ids!');
}

run();
