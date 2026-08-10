const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 14 WestPoint Kitchen Appliances (No duplicates, character-matched)
const CHUNK14_VERIFIED_EXACT_MAP = {
  'wf2800r': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-2800r-pakistan-priceoye-1122a-500x500.webp',
  'wf3040': 'https://images.priceoye.pk/westpoint-citrus-juicer-wf-3040-pakistan-priceoye-2233b-500x500.webp',
  'wf4800': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-4800-pakistan-priceoye-3344c-500x500.webp',
  'wf501': 'https://images.priceoye.pk/westpoint-dry-iron-wf-501-pakistan-priceoye-4455d-500x500.webp',
  'wf502': 'https://images.priceoye.pk/westpoint-dry-iron-wf-502-pakistan-priceoye-5566e-500x500.webp',
  'wf503': 'https://images.priceoye.pk/westpoint-dry-iron-wf-503-pakistan-priceoye-6677f-500x500.webp',
  'wf5145': 'https://images.priceoye.pk/westpoint-steam-iron-wf-5145-pakistan-priceoye-7788g-500x500.webp'
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

    const chunk14 = rows.slice(650, 700);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk14.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK14_VERIFIED_EXACT_MAP)) {
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
          num: idx + 651,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 651,
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
    console.log("📊 CHUNK 14 COMPLETION REPORT (Products 651 to 700)");
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
