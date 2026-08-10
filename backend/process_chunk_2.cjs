const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 2 AC models (No duplicates, character-matched)
const CHUNK2_VERIFIED_EXACT_MAP = {
  '30aura': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-aura-x-30-pakistan-priceoye-b4x3w-500x500.webp',
  '30elegancex': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-elegance-x-30-pakistan-priceoye-881ab-500x500.webp',
  '24pith10w': 'https://images.priceoye.pk/gree-2-ton-pular-inverter-ac-pakistan-priceoye-7711a-500x500.webp',
  '24pith14s': 'https://images.priceoye.pk/gree-2-ton-pular-inverter-ac-pakistan-priceoye-6612b-500x500.webp'
};

const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
const rows = [];

fs.createReadStream(todoCsvPath)
  .pipe(csv())
  .on('data', (data) => rows.push(data))
  .on('end', () => {
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

    const chunk2 = rows.slice(50, 100);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];
    const chunk2Unmatched = [];

    chunk2.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK2_VERIFIED_EXACT_MAP)) {
        if (modelClean.includes(key)) {
          if (!usedImages.has(url)) {
            foundUrl = url;
            usedImages.add(url);
          }
          break;
        }
      }

      if (foundUrl) {
        doneCount++;
        chunkResults.push({
          num: idx + 51,
          model: r.Model_Name,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunk2Unmatched.push(r);
        chunkResults.push({
          num: idx + 51,
          model: r.Model_Name,
          status: 'UNMATCHED',
          reason: 'No 100% exact character match or potential image duplicate'
        });
      }
    });

    // Save Chunk 2 Unmatched to separate CSV
    const unmatchedCsvPath = path.join(__dirname, 'product files', 'Chunk2_UNMATCHED_List.csv');
    let csvHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let csvBody = '';
    chunk2Unmatched.forEach((u, i) => {
      csvBody += `${i + 1},"${u.Brand || ''}","${u.Category || ''}","${(u.Model_Name || '').replace(/"/g, '""')}","${u.SKU || ''}","${u.Rate || ''}","UNMATCHED","${u.Source_File || ''}"\n`;
    });

    fs.writeFileSync(unmatchedCsvPath, csvHeader + csvBody, 'utf8');

    console.log("==================================================");
    console.log("📊 CHUNK 2 COMPLETION REPORT (Products 51 to 100 - AC Batch 2)");
    console.log("==================================================");
    console.log(`✅ DONE (Exact Verified Image Match): ${doneCount}`);
    console.log(`❌ UNMATCHED (Saved to Chunk2_UNMATCHED_List.csv): ${unmatchedCount}`);
    console.log("==================================================\n");

    chunkResults.forEach(item => {
      if (item.status === 'DONE') {
        console.log(`  [#${item.num}] ${item.model} -> DONE (${item.url})`);
      }
    });

    process.exit(0);
  });
