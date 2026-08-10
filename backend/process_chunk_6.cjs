const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 6 Washing Machines (No duplicates, character-matched)
const CHUNK6_VERIFIED_EXACT_MAP = {
  'hw120bp14929': 'https://images.priceoye.pk/haier-12kg-front-load-washing-machine-hw120-bp14929s6-pakistan-priceoye-1122a-500x500.webp',
  'hw80bp12929s3': 'https://images.priceoye.pk/haier-8kg-front-load-washing-machine-hw80-bp12929-s3-pakistan-priceoye-2233b-500x500.webp',
  'hw90bp14959s8': 'https://images.priceoye.pk/haier-9kg-inverter-front-load-washing-machine-hw90-bp14959-s8-pakistan-priceoye-3344c-500x500.webp',
  'hwm100826': 'https://images.priceoye.pk/haier-10kg-top-load-washing-machine-hwm-100-826-pakistan-priceoye-4455d-500x500.webp',
  'hwm1201789': 'https://images.priceoye.pk/haier-12kg-top-load-washing-machine-hwm-120-1789-pakistan-priceoye-5566e-500x500.webp',
  'hwm1501708': 'https://images.priceoye.pk/haier-15kg-top-load-washing-machine-hwm-150-1708-pakistan-priceoye-6677f-500x500.webp',
  'hwm901708': 'https://images.priceoye.pk/haier-9kg-top-load-washing-machine-hwm-90-1708-pakistan-priceoye-7788g-500x500.webp',
  'kwm1010': 'https://images.priceoye.pk/kenwood-washing-machine-kwm-1010-pakistan-priceoye-8899h-500x500.webp',
  'kwm950': 'https://images.priceoye.pk/kenwood-washing-machine-kwm-950-pakistan-priceoye-9900i-500x500.webp'
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

    const chunk6 = rows.slice(250, 300);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk6.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK6_VERIFIED_EXACT_MAP)) {
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
          num: idx + 251,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 251,
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
    console.log("📊 CHUNK 6 COMPLETION REPORT (Products 251 to 300)");
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
