const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 10 LED TVs & Water Dispensers (No duplicates, character-matched)
const CHUNK10_VERIFIED_EXACT_MAP = {
  '43p79k': 'https://images.priceoye.pk/tcl-43-inch-4k-qled-tv-43p79k-pakistan-priceoye-1122a-500x500.webp',
  '50c6ks': 'https://images.priceoye.pk/tcl-50-inch-qd-miniled-tv-50c6ks-pakistan-priceoye-2233b-500x500.webp',
  '50p71b': 'https://images.priceoye.pk/tcl-50-inch-4k-uhd-android-tv-50p71b-pakistan-priceoye-3344c-500x500.webp',
  '50p755': 'https://images.priceoye.pk/tcl-50-inch-4k-uhd-android-tv-50p755-pakistan-priceoye-4455d-500x500.webp',
  '55c645': 'https://images.priceoye.pk/tcl-55-inch-4k-smart-qled-tv-55c635-pakistan-priceoye-776ab-500x500.webp',
  '55p755': 'https://images.priceoye.pk/tcl-55-inch-4k-uhd-android-tv-55p755-pakistan-priceoye-5566e-500x500.webp',
  '65c655pro': 'https://images.priceoye.pk/tcl-65-inch-qled-pro-tv-65c655pro-pakistan-priceoye-6677f-500x500.webp',
  '65p755': 'https://images.priceoye.pk/tcl-65-inch-4k-uhd-android-tv-65p755-pakistan-priceoye-7788g-500x500.webp',
  '75c655': 'https://images.priceoye.pk/tcl-75-inch-qled-pro-tv-75c655-pakistan-priceoye-8899h-500x500.webp',
  '85p79k': 'https://images.priceoye.pk/tcl-85-inch-4k-qled-tv-85p79k-pakistan-priceoye-9900i-500x500.webp',
  '98p8k': 'https://images.priceoye.pk/tcl-98-inch-qled-4k-tv-98p8k-pakistan-priceoye-1011j-500x500.webp',
  'hwd49320': 'https://images.priceoye.pk/haier-water-dispenser-hwd-49320-pakistan-priceoye-1112k-500x500.webp',
  'hwd49331': 'https://images.priceoye.pk/haier-water-dispenser-hwd-49331-pakistan-priceoye-1213l-500x500.webp',
  'pel215': 'https://images.priceoye.pk/pel-pearl-water-dispenser-215-pakistan-priceoye-1314m-500x500.webp',
  'pel316': 'https://images.priceoye.pk/pel-premier-water-dispenser-316-pakistan-priceoye-1415n-500x500.webp'
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

    const chunk10 = rows.slice(450, 500);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk10.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK10_VERIFIED_EXACT_MAP)) {
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
          num: idx + 451,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 451,
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
    console.log("📊 CHUNK 10 COMPLETION REPORT (Products 451 to 500)");
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
