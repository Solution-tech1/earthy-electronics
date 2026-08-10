const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
const rows = [];

fs.createReadStream(todoCsvPath)
  .pipe(csv())
  .on('data', (data) => rows.push(data))
  .on('end', () => {
    console.log(`Parsed ${rows.length} total products from Products_NEEDING_Images_TODO.csv.\n`);

    // Sort by Category (AC first, Washing Machine second, Microwave third, LED fourth, Water Dispenser fifth, Kitchen sixth)
    const catPriority = {
      'AC': 1,
      'Washing Machine': 2,
      'Microwave': 3,
      'LED': 4,
      'Water Dispenser': 5,
      'Kitchen Appliance': 6
    };

    rows.sort((a, b) => {
      const pA = catPriority[a.Category] || 99;
      const pB = catPriority[b.Category] || 99;
      if (pA !== pB) return pA - pB;
      return (a.Brand || '').localeCompare(b.Brand || '');
    });

    // Chunk 1: First 50 products
    const chunk1 = rows.slice(0, 50);

    console.log("=== CHUNK 1 (PRODUCTS 1 TO 50 - AC CATEGORY) PREVIEW ===");
    console.log(`Total in Chunk 1: ${chunk1.length} products\n`);

    chunk1.forEach((r, index) => {
      console.log(`${index + 1}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
