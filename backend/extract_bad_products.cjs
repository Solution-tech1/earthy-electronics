const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

// Note: Using a library to correctly escape CSV fields
function jsonToCsv(items) {
  if (items.length === 0) return '';
  const header = Object.keys(items[0]);
  const rows = items.map(row => 
    header.map(fieldName => {
      let val = row[fieldName];
      if (val === null || val === undefined) val = '';
      let str = String(val);
      // Escape quotes
      if (str.includes('"')) {
        str = str.replace(/"/g, '""');
      }
      // Wrap in quotes if it contains commas, newlines or quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    }).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

// 1. Extract Unmatched Database Products
async function extractUnmatchedFromDB() {
  return new Promise((resolve, reject) => {
    const mysql = require('mysql2/promise');
    mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'earthyelectronics'
    }).then(async (connection) => {
        console.log('Connected to MariaDB to extract unmatched products...');
        
        // Ensure NO successfully uploaded products are extracted.
        const query = `
          SELECT id, name, category, brand, price, discountPrice, stock, sku, image, created_at 
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

// 2. Merge all remaining raw files
async function mergePendingFiles() {
  const sourceDir = path.join(__dirname, 'all products files');
  const backupDir = path.join(__dirname, 'archived_raw_files');
  if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
  }

  // Files we ALREADY processed, do not merge these!
  const ignoreFiles = ['LED UPLOADING.xlsx', 'water dispenser.xlsx', 'HAIER JUNE-26 MRP.pdf'];

  const allFiles = fs.readdirSync(sourceDir).filter(f => {
      const stats = fs.statSync(path.join(sourceDir, f));
      return stats.isFile() && !ignoreFiles.includes(f) && (f.endsWith('.csv') || f.endsWith('.xlsx'));
  });

  console.log(`Found ${allFiles.length} pending files to merge.`);

  let mergedData = [];

  for (const file of allFiles) {
      const filePath = path.join(sourceDir, file);
      console.log(`Reading: ${file}`);
      
      try {
          if (file.endsWith('.xlsx')) {
              const workbook = xlsx.readFile(filePath);
              const sheetName = workbook.SheetNames[0];
              const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
              mergedData = mergedData.concat(data.map(d => ({ ...d, SourceFile: file })));
          } else if (file.endsWith('.csv')) {
              const data = await new Promise((resolve) => {
                  const results = [];
                  fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => results.push({ ...data, SourceFile: file }))
                    .on('end', () => resolve(results));
              });
              mergedData = mergedData.concat(data);
          }
          
          // Move to archive after reading
          fs.renameSync(filePath, path.join(backupDir, file));
      } catch (err) {
          console.error(`Error reading ${file}:`, err);
      }
  }

  if (mergedData.length > 0) {
      // Ensure unified CSV structure
      const allKeys = new Set();
      mergedData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      
      const headerKeys = Array.from(allKeys);
      const cleanedData = mergedData.map(row => {
          const newRow = {};
          headerKeys.forEach(k => {
              newRow[k] = row[k] || '';
          });
          return newRow;
      });

      const csvData = jsonToCsv(cleanedData);
      fs.writeFileSync('E:\\Pending_Products_Raw_Data.csv', csvData);
      console.log(`✅ Merged ${allFiles.length} files (${cleanedData.length} total rows) to E:\\Pending_Products_Raw_Data.csv`);
  } else {
      console.log('✅ No pending files left to merge.');
  }
}

async function run() {
    try {
        // Database is currently offline, skipping unmatched extraction for now
        // await extractUnmatchedFromDB();
        await mergePendingFiles();
        console.log('✨ All extraction tasks completed successfully!');
    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

run();
