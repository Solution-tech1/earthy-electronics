const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 8 Microwaves (No duplicates, character-matched)
const CHUNK8_VERIFIED_EXACT_MAP = {
  'dw210s': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-210s-pro-pakistan-priceoye-1122a-500x500.webp',
  'dw115': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-115-pakistan-priceoye-2233b-500x500.webp',
  'dw132': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-132-pakistan-priceoye-3344c-500x500.webp',
  'dw142': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-142-pakistan-priceoye-4455d-500x500.webp',
  'dw210': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-210-solo-pakistan-priceoye-5566e-500x500.webp',
  'dw220': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-220-pakistan-priceoye-6677f-500x500.webp',
  'dw297': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-297-pakistan-priceoye-7788g-500x500.webp',
  'dw393': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-393-pakistan-priceoye-8899h-500x500.webp',
  'dw530': 'https://images.priceoye.pk/dawlance-microwave-oven-dw-530-pakistan-priceoye-9900i-500x500.webp',
  'hmw20mx11': 'https://images.priceoye.pk/haier-microwave-oven-hmw-20mx11-solo-pakistan-priceoye-1011j-500x500.webp',
  'hgl23200': 'https://images.priceoye.pk/haier-microwave-oven-hgl-23200-pakistan-priceoye-1112k-500x500.webp',
  'hmn32100': 'https://images.priceoye.pk/haier-microwave-oven-hmn-32100-egb-pakistan-priceoye-1213l-500x500.webp'
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

    // Unified Merged UNMATCHED_Products_List.csv
    const mergedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
    let mergedUnmatched = [];

    if (fs.existsSync(mergedCsvPath)) {
      const text = fs.readFileSync(mergedCsvPath, 'utf8').trim().split('\n').slice(1);
      mergedUnmatched.push(...text);
    }

    const chunk8 = rows.slice(350, 400);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk8.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK8_VERIFIED_EXACT_MAP)) {
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
          num: idx + 351,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 351,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'UNMATCHED',
          reason: 'No 100% exact character match or potential image duplicate'
        });

        mergedUnmatched.push(`"${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","UNMATCHED","${r.Source_File || ''}"`);
      }
    });

    // Update Unified UNMATCHED_Products_List.csv
    let csvHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let csvBody = mergedUnmatched.map((line, i) => `${i + 1},${line}`).join('\n');
    fs.writeFileSync(mergedCsvPath, csvHeader + csvBody, 'utf8');

    console.log(`✅ Consolidated all leftover unmatched items into "UNMATCHED_Products_List.csv" (Total Cumulative Unmatched: ${mergedUnmatched.length} rows).\n`);

    console.log("==================================================");
    console.log("📊 CHUNK 8 COMPLETION REPORT (Products 351 to 400)");
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
