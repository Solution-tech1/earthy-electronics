const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Chunk 1 verified matches
const CHUNK1_VERIFIED_EXACT_MAP = {
  '12aith': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-6p75a-500x500.webp',
  '12pith10w': 'https://images.priceoye.pk/gree-1-ton-pular-inverter-ac-pakistan-priceoye-998ab-500x500.webp',
  '12pith14s': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-8712a-500x500.webp',
  '13hfa': 'https://images.priceoye.pk/haier-1-ton-thunder-inverter-hsu-12hfpaa-pakistan-priceoye-7578j-500x500.webp',
  '13hfc': 'https://images.priceoye.pk/haier-1-ton-inverter-hsu-12hfc-pakistan-priceoye-12466-500x500.webp',
  '15aura': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-aura-x-30-pakistan-priceoye-b4x3w-500x500.webp',
  '15elegancex': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-elegance-x-30-pakistan-priceoye-881ab-500x500.webp',
  '18hfm': 'https://images.priceoye.pk/haier-1-5-ton-inverter-hsu-18hfm-pakistan-priceoye-6a422-500x500.webp'
};

const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
const rows = [];

fs.createReadStream(todoCsvPath)
  .pipe(csv())
  .on('data', (data) => rows.push(data))
  .on('end', () => {
    // Sort category-wise (AC first)
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

    // Chunk 1: Products 1 to 50
    const chunk1 = rows.slice(0, 50);
    const chunk1Unmatched = [];

    chunk1.forEach((r) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let isMatch = false;
      for (const key of Object.keys(CHUNK1_VERIFIED_EXACT_MAP)) {
        if (modelClean.includes(key)) {
          isMatch = true;
          break;
        }
      }
      if (!isMatch) {
        chunk1Unmatched.push(r);
      }
    });

    // Save Chunk 1 Unmatched to separate CSV
    const unmatchedCsvPath = path.join(__dirname, 'product files', 'Chunk1_UNMATCHED_List.csv');
    let csvHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let csvBody = '';
    chunk1Unmatched.forEach((u, i) => {
      csvBody += `${i + 1},"${u.Brand || ''}","${u.Category || ''}","${(u.Model_Name || '').replace(/"/g, '""')}","${u.SKU || ''}","${u.Rate || ''}","UNMATCHED","${u.Source_File || ''}"\n`;
    });

    fs.writeFileSync(unmatchedCsvPath, csvHeader + csvBody, 'utf8');
    console.log(`✅ Saved ${chunk1Unmatched.length} Chunk 1 Unmatched items to "Chunk1_UNMATCHED_List.csv".\n`);

    // Chunk 2: Products 51 to 100
    const chunk2 = rows.slice(50, 100);

    console.log("=== CHUNK 2 (PRODUCTS 51 TO 100 - AIR CONDITIONERS BATCH 2) PREVIEW ===");
    console.log(`Total in Chunk 2: ${chunk2.length} products\n`);

    chunk2.forEach((r, idx) => {
      console.log(`${idx + 51}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
    });

    process.exit(0);
  });
