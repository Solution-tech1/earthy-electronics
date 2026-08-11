const fs = require('fs');
const path = require('path');

function jsonToCsv(items) {
  if (items.length === 0) return '';
  const header = Object.keys(items[0]);
  const rows = items.map(row => 
    header.map(fieldName => {
      let val = row[fieldName];
      if (val === null || val === undefined) val = '';
      let str = String(val);
      if (str.includes('"')) {
        str = str.replace(/"/g, '""');
      }
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    }).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

async function extractUnmatchedFromDB() {
  return new Promise((resolve, reject) => {
    const mysql = require('mysql2/promise');
    mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'earthyelectronics'
    }).then(async (connection) => {
        console.log('Connected to XAMPP MySQL to extract unmatched products...');
        
        // Ensure NO successfully uploaded products are extracted.
        const query = `
          SELECT id, name, category, brand, price, discountPrice, stock, image, created_at, group_id 
          FROM products 
          WHERE image IS NULL 
             OR image = 'NO_IMAGE_FOUND' 
             OR image LIKE '/images/cat_%'
             OR image = ''
        `;
        const [rows] = await connection.execute(query);
        
        if (rows.length > 0) {
            const csvData = jsonToCsv(rows);
            fs.writeFileSync('E:\\Unmatched_Database_Products.csv', csvData);
            console.log(`✅ Exported ${rows.length} unmatched products from database to E:\\Unmatched_Database_Products.csv`);
        } else {
            console.log('✅ No unmatched products found in the database.');
        }
        await connection.end();
        resolve();
    }).catch(err => {
        console.error('Database connection failed:', err);
        reject(err);
    });
  });
}

extractUnmatchedFromDB();
