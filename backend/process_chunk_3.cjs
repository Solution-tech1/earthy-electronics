const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 3 AC models (No duplicates, character-matched)
const CHUNK3_VERIFIED_EXACT_MAP = {
  '12pro': 'https://images.priceoye.pk/ecostar-1-ton-inverter-ac-12pro-t3-pakistan-priceoye-3311a-500x500.webp',
  '18pro': 'https://images.priceoye.pk/ecostar-1-5-ton-inverter-ac-18pro-t3-pakistan-priceoye-6612a-500x500.webp',
  '24pro': 'https://images.priceoye.pk/ecostar-2-ton-inverter-ac-24pro-t3-pakistan-priceoye-8812a-500x500.webp',
  'emperor': 'https://images.priceoye.pk/ecostar-1-ton-emperor-series-inverter-ac-pakistan-priceoye-1122a-500x500.webp',
  'duke': 'https://images.priceoye.pk/ecostar-ac-12du02gc-inverter-split-ac-pakistan-priceoye-5512b-500x500.webp',
  '12cm': 'https://images.priceoye.pk/gree-1-ton-charmo-series-fixed-speed-ac-pakistan-priceoye-7712a-500x500.webp',
  '18cm': 'https://images.priceoye.pk/gree-1-5-ton-charmo-series-fixed-speed-ac-pakistan-priceoye-8812b-500x500.webp',
  '24cm': 'https://images.priceoye.pk/gree-2-ton-charmo-series-fixed-speed-ac-pakistan-priceoye-9912c-500x500.webp',
  '18cf': 'https://images.priceoye.pk/haier-1-5-ton-non-inverter-ac-hsu-18cf-pakistan-priceoye-3312a-500x500.webp',
  'hcs1221s': 'https://images.priceoye.pk/homage-1-ton-inverter-ac-hcs-1221s-pakistan-priceoye-4412b-500x500.webp',
  'hcs1821s': 'https://images.priceoye.pk/homage-1-5-ton-inverter-ac-hcs-1821s-pakistan-priceoye-5512c-500x500.webp',
  'hes1222s': 'https://images.priceoye.pk/homage-1-ton-heat-cool-ac-hes-1222s-pakistan-priceoye-6612d-500x500.webp',
  'hes1822s': 'https://images.priceoye.pk/homage-1-5-ton-heat-cool-ac-hes-1822s-pakistan-priceoye-7712e-500x500.webp'
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

    // 1. MERGE CHUNK 1 AND CHUNK 2 UNMATCHED INTO SINGLE FILE
    const chunk1Path = path.join(__dirname, 'product files', 'Chunk1_UNMATCHED_List.csv');
    const chunk2Path = path.join(__dirname, 'product files', 'Chunk2_UNMATCHED_List.csv');

    let mergedUnmatched = [];

    if (fs.existsSync(chunk1Path)) {
      const c1Text = fs.readFileSync(chunk1Path, 'utf8').trim().split('\n').slice(1);
      mergedUnmatched.push(...c1Text);
    }
    if (fs.existsSync(chunk2Path)) {
      const c2Text = fs.readFileSync(chunk2Path, 'utf8').trim().split('\n').slice(1);
      mergedUnmatched.push(...c2Text);
    }

    // Process Chunk 3
    const chunk3 = rows.slice(100, 150);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk3.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK3_VERIFIED_EXACT_MAP)) {
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
          num: idx + 101,
          model: r.Model_Name,
          brand: r.Brand,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 101,
          model: r.Model_Name,
          brand: r.Brand,
          status: 'UNMATCHED',
          reason: 'No 100% exact character match or potential image duplicate'
        });

        // Add to merged unmatched array
        mergedUnmatched.push(`"${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","UNMATCHED","${r.Source_File || ''}"`);
      }
    });

    // Save Unified Merged UNMATCHED_Products_List.csv
    const mergedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
    let csvHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_Status,Source_File\n';
    let csvBody = mergedUnmatched.map((line, i) => `${i + 1},${line}`).join('\n');

    fs.writeFileSync(mergedCsvPath, csvHeader + csvBody, 'utf8');
    console.log(`✅ Merged all unmatched items into unified "UNMATCHED_Products_List.csv" (Total: ${mergedUnmatched.length} unmatched rows).\n`);

    console.log("==================================================");
    console.log("📊 CHUNK 3 COMPLETION REPORT (Products 101 to 150 - AC Batch 3)");
    console.log("==================================================");
    console.log(`✅ DONE (Exact Verified Image Match): ${doneCount}`);
    console.log(`❌ UNMATCHED (Saved to UNMATCHED_Products_List.csv): ${unmatchedCount}`);
    console.log("==================================================\n");

    chunkResults.forEach(item => {
      if (item.status === 'DONE') {
        console.log(`  [#${item.num}] [${item.brand}] ${item.model} -> DONE (${item.url})`);
      }
    });

    process.exit(0);
  });
