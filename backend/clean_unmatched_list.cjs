const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');

// Load original TODO products
const allTodo = [];
fs.createReadStream(todoCsvPath)
  .pipe(csv())
  .on('data', (d) => allTodo.push(d))
  .on('end', () => {
    // Load unmatched lines or models
    const unmatchedModels = new Set();
    
    if (fs.existsSync(unmatchedCsvPath)) {
      const rawText = fs.readFileSync(unmatchedCsvPath, 'utf8');
      const lines = rawText.split('\n');
      lines.forEach(l => {
        if (l.includes('UNMATCHED')) {
          allTodo.forEach(t => {
            if (l.includes(t.Model_Name)) {
              unmatchedModels.add(t.Model_Name);
            }
          });
        }
      });
    }

    console.log(`Original TODO Total: ${allTodo.length}`);
    console.log(`Identified Unmatched Models: ${unmatchedModels.size}`);

    // Re-extract actual unmatched items from allTodo preserving exact structure!
    const cleanUnmatched = allTodo.filter(t => unmatchedModels.has(t.Model_Name));

    const catPriority = {
      'AC': 1,
      'Washing Machine': 2,
      'Microwave': 3,
      'LED': 4,
      'Water Dispenser': 5,
      'Kitchen Appliance': 6
    };

    cleanUnmatched.sort((a, b) => {
      const pA = catPriority[a.Category] || 99;
      const pB = catPriority[b.Category] || 99;
      if (pA !== pB) return pA - pB;
      return (a.Brand || '').localeCompare(b.Brand || '');
    });

    // Write clean UNMATCHED_Products_List.csv
    let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let body = cleanUnmatched.map((r, i) => 
      `${i + 1},"${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","UNMATCHED","${r.Source_File || ''}"`
    ).join('\n');

    fs.writeFileSync(unmatchedCsvPath, header + body, 'utf8');
    console.log(`Successfully cleaned and saved ${cleanUnmatched.length} valid unmatched products to UNMATCHED_Products_List.csv!`);

    // Preview Chunk 1 (Products 1-50)
    console.log("\n=== CLEAN UNMATCHED BATCH - CHUNK 1 (PRODUCTS 1 TO 50) PREVIEW ===");
    const chunk1 = cleanUnmatched.slice(0, 50);
    chunk1.forEach((r, idx) => {
      console.log(`${idx + 1}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
