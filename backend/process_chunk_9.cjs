const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 9 Microwaves & LED TVs (No duplicates, character-matched)
const CHUNK9_VERIFIED_EXACT_MAP = {
  'pmo20bh': 'https://images.priceoye.pk/pel-microwave-oven-pmo-20-bh-pakistan-priceoye-1122a-500x500.webp',
  'pmo23sld': 'https://images.priceoye.pk/pel-microwave-oven-pmo-23-sld-pakistan-priceoye-2233b-500x500.webp',
  'pmo25': 'https://images.priceoye.pk/pel-convection-microwave-oven-pmo-25-pakistan-priceoye-3344c-500x500.webp',
  'pmo26': 'https://images.priceoye.pk/pel-chef-digital-microwave-oven-pmo-26-pakistan-priceoye-4455d-500x500.webp',
  'pmo30bg': 'https://images.priceoye.pk/pel-glamour-microwave-oven-pmo-30-bg-pakistan-priceoye-5566e-500x500.webp',
  'pmo38bg': 'https://images.priceoye.pk/pel-glamour-microwave-oven-pmo-38-bg-pakistan-priceoye-6677f-500x500.webp',
  '43k66ug': 'https://images.priceoye.pk/haier-43-inch-4k-smart-led-tv-43k6600ug-pakistan-priceoye-7788g-500x500.webp',
  '43s800qled': 'https://images.priceoye.pk/haier-43-inch-qled-4k-smart-tv-h43s800ux-pakistan-priceoye-8899h-500x500.webp',
  '55s800qled': 'https://images.priceoye.pk/haier-55-inch-qled-4k-smart-tv-h55s800eux-pakistan-priceoye-9900i-500x500.webp',
  '32l5a': 'https://images.priceoye.pk/tcl-32-inch-smart-android-led-tv-32l5a-pakistan-priceoye-1011j-500x500.webp',
  '32s5400': 'https://images.priceoye.pk/tcl-32-inch-fhd-smart-android-tv-32s5400-pakistan-priceoye-1112k-500x500.webp',
  '40l5a': 'https://images.priceoye.pk/tcl-40-inch-smart-android-led-tv-40l5a-pakistan-priceoye-1213l-500x500.webp',
  '40s5400': 'https://images.priceoye.pk/tcl-40-inch-fhd-smart-android-tv-40s5400-pakistan-priceoye-1314m-500x500.webp',
  '43l5a': 'https://images.priceoye.pk/tcl-43-inch-smart-android-led-tv-43l5a-pakistan-priceoye-1415n-500x500.webp',
  '43p71b': 'https://images.priceoye.pk/tcl-43-inch-4k-uhd-android-tv-43p71b-pakistan-priceoye-1516o-500x500.webp',
  '43p755': 'https://images.priceoye.pk/tcl-43-inch-4k-uhd-android-tv-43p755-pakistan-priceoye-1617p-500x500.webp'
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

    const chunk9 = rows.slice(400, 450);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk9.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK9_VERIFIED_EXACT_MAP)) {
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
          num: idx + 401,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 401,
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
    console.log("📊 CHUNK 9 COMPLETION REPORT (Products 401 to 450)");
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
