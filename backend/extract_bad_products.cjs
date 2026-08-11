const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

// 2. Merge all remaining raw files using streaming/appending
async function mergePendingFiles() {
  const sourceDir = path.join(__dirname, 'archived_raw_files');
  const backupDir = path.join(__dirname, 'archived_raw_files');
  const outputFile = 'E:\\Pending_Products_Raw_Data.csv';
  
  if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
  }

  // Clear output file if exists
  if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
  }

  // Files we ALREADY processed, do not merge these!
  const ignoreFiles = ['LED UPLOADING.xlsx', 'water dispenser.xlsx', 'HAIER JUNE-26 MRP.pdf'];

  const allFiles = fs.readdirSync(sourceDir).filter(f => {
      const stats = fs.statSync(path.join(sourceDir, f));
      return stats.isFile() && !ignoreFiles.includes(f) && (f.endsWith('.csv') || f.endsWith('.xlsx'));
  });

  console.log(`Found ${allFiles.length} pending files to merge.`);

  // First pass: collect ALL possible headers
  const allHeaders = new Set(['SourceFile']);
  
  for (const file of allFiles) {
      const filePath = path.join(sourceDir, file);
      try {
          if (file.endsWith('.xlsx')) {
              const workbook = xlsx.readFile(filePath);
              const sheetName = workbook.SheetNames[0];
              const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
              if (data.length > 0 && Array.isArray(data[0])) {
                  data[0].forEach(h => { if(h) allHeaders.add(h); });
              } else if (data.length > 0) {
                  Object.keys(data[0]).forEach(k => allHeaders.add(k));
              }
          } else if (file.endsWith('.csv')) {
              await new Promise((resolve) => {
                  fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('headers', (headers) => {
                        headers.forEach(h => { if(h) allHeaders.add(h); });
                    })
                    .on('end', () => resolve());
              });
          }
      } catch (err) {
          console.error(`Error reading headers from ${file}:`, err);
      }
  }

  const headerArray = Array.from(allHeaders);
  
  // Write header row to output file
  const headerRow = headerArray.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
  fs.writeFileSync(outputFile, headerRow + '\n');

  // Second pass: read and stream write
  for (const file of allFiles) {
      const filePath = path.join(sourceDir, file);
      console.log(`Appending: ${file}`);
      
      try {
          if (file.endsWith('.xlsx')) {
              const workbook = xlsx.readFile(filePath);
              const sheetName = workbook.SheetNames[0];
              const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
              const rows = data.map(row => {
                  row['SourceFile'] = file;
                  return headerArray.map(h => {
                      let val = row[h] || '';
                      return `"${String(val).replace(/"/g, '""')}"`;
                  }).join(',');
              });
              if(rows.length > 0) fs.appendFileSync(outputFile, rows.join('\n') + '\n');
          } else if (file.endsWith('.csv')) {
              await new Promise((resolve) => {
                  const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });
                  fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        row['SourceFile'] = file;
                        const csvStr = headerArray.map(h => {
                            let val = row[h] || '';
                            return `"${String(val).replace(/"/g, '""')}"`;
                        }).join(',');
                        writeStream.write(csvStr + '\n');
                    })
                    .on('end', () => {
                        writeStream.end();
                        resolve();
                    });
              });
          }
          
          // Move to archive after reading
          fs.renameSync(filePath, path.join(backupDir, file));
      } catch (err) {
          console.error(`Error appending ${file}:`, err);
      }
  }

  console.log(`✅ Successfully streamed and merged ${allFiles.length} files to ${outputFile}`);
}

async function run() {
    try {
        await mergePendingFiles();
        console.log('✨ All extraction tasks completed successfully!');
    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

run();
