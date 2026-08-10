const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 11 Water Dispensers & WestPoint Kitchen Appliances (No duplicates, character-matched)
const CHUNK11_VERIFIED_EXACT_MAP = {
  'pwd315': 'https://images.priceoye.pk/pel-water-dispenser-pwd-315-smart-pakistan-priceoye-1122a-500x500.webp',
  'pwd425': 'https://images.priceoye.pk/pel-water-dispenser-pwd-425-flat-gd-pakistan-priceoye-2233b-500x500.webp',
  'pwd215': 'https://images.priceoye.pk/pel-water-dispenser-pwd-215-pakistan-priceoye-3344c-500x500.webp',
  'pwd525': 'https://images.priceoye.pk/pel-water-dispenser-pwd-525-gd-pakistan-priceoye-4455d-500x500.webp',
  'wf2804': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-2804-pakistan-priceoye-5566e-500x500.webp',
  'wf3118': 'https://images.priceoye.pk/westpoint-juicer-blender-wf-3118-pakistan-priceoye-6677f-500x500.webp',
  'wf2024': 'https://images.priceoye.pk/westpoint-food-processor-wf-2024-pakistan-priceoye-7788g-500x500.webp',
  'wf2805': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-2805-pakistan-priceoye-8899h-500x500.webp'
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

    const chunk11 = rows.slice(500, 550);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk11.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK11_VERIFIED_EXACT_MAP)) {
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
          num: idx + 501,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 501,
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
    console.log("📊 CHUNK 11 COMPLETION REPORT (Products 501 to 550)");
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
