const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

const safeJSON = (str) => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch (e) { return null; }
};

async function dumpProducts() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'earthyelectronics'
    });
    
    console.log('Fetching products from local DB...');
    const [rows] = await connection.execute("SELECT * FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' ORDER BY category, name");
    
    const data = rows.map(p => ({ ...p, specifications: safeJSON(p.specifications) }));
    const jsonOutput = JSON.stringify({ status: 'success', data }, null, 2);
    
    const destDir = path.join(__dirname, '../frontend/public/data');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const destFile = path.join(destDir, 'products.json');
    fs.writeFileSync(destFile, jsonOutput);
    console.log(`Successfully dumped ${data.length} products to ${destFile}`);
    
    await connection.end();
  } catch (err) {
    console.error('Failed to dump products:', err);
  }
}

dumpProducts();
