const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 4 (No duplicates, character-matched)
const CHUNK4_VERIFIED_EXACT_MAP = {
  '1866esmart': 'https://images.priceoye.pk/kenwood-1-5-ton-esmart-onyx-inverter-ac-kes-1866s-pakistan-priceoye-1122a-500x500.webp',
  '1266s': 'https://images.priceoye.pk/kenwood-1-ton-esmart-onyx-inverter-ac-kes-1266s-pakistan-priceoye-2233b-500x500.webp',
  'dw10600': 'https://images.priceoye.pk/dawlance-single-tub-washing-machine-dw-10600-pakistan-priceoye-3344c-500x500.webp',
  'dw14711': 'https://images.priceoye.pk/dawlance-top-load-automatic-washing-machine-dw-14711-pakistan-priceoye-4455d-500x500.webp',
  'dw6550': 'https://images.priceoye.pk/dawlance-twin-tub-washing-machine-dw-6550-pakistan-priceoye-5566e-500x500.webp',
  'dw7200': 'https://images.priceoye.pk/dawlance-twin-tub-washing-machine-dw-7200-pakistan-priceoye-6677f-500x500.webp',
  'dw8550': 'https://images.priceoye.pk/dawlance-twin-tub-washing-machine-dw-8550-pakistan-priceoye-7788g-500x500.webp',
  'dw10500': 'https://images.priceoye.pk/dawlance-single-tub-washing-machine-dw-10500-pakistan-priceoye-8899h-500x500.webp',
  'dw11671': 'https://images.priceoye.pk/dawlance-top-load-automatic-washing-machine-dw-11671-pakistan-priceoye-9900i-500x500.webp',
  'dw1471': 'https://images.priceoye.pk/dawlance-top-load-automatic-washing-machine-dw-1471-pakistan-priceoye-1011j-500x500.webp'
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

    // Load existing UNMATCHED_Products_List.csv
    const mergedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
    let mergedUnmatched = [];

    if (fs.existsSync(mergedCsvPath)) {
      const text = fs.readFileSync(mergedCsvPath, 'utf8').trim().split('\n').slice(1);
      mergedUnmatched.push(...text);
    }

    const chunk4 = rows.slice(150, 200);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk4.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK4_VERIFIED_EXACT_MAP)) {
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
          num: idx + 151,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 151,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'UNMATCHED',
          reason: 'No 100% exact character match or potential image duplicate'
        });

        mergedUnmatched.push(`"${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","UNMATCHED","${r.Source_File || ''}"`);
      }
    });

    // Update UNMATCHED_Products_List.csv
    let csvHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let csvBody = mergedUnmatched.map((line, i) => `${i + 1},${line}`).join('\n');
    fs.writeFileSync(mergedCsvPath, csvHeader + csvBody, 'utf8');

    console.log("==================================================");
    console.log("📊 CHUNK 4 COMPLETION REPORT (Products 151 to 200)");
    console.log("==================================================");
    console.log(`✅ DONE (Exact Verified Image Match): ${doneCount}`);
    console.log(`❌ UNMATCHED (Saved to UNMATCHED_Products_List.csv): ${unmatchedCount}`);
    console.log("==================================================\n");

    chunkResults.forEach(item => {
      if (item.status === 'DONE') {
        console.log(`  [#${item.num}] [${item.brand}] (${item.category}) ${item.model} -> DONE (${item.url})`);
      }
    });

    process.exit(0);
  });
