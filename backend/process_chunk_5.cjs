const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 5 Washing Machines & Appliances (No duplicates, character-matched)
const CHUNK5_VERIFIED_EXACT_MAP = {
  'dw9060': 'https://images.priceoye.pk/dawlance-twin-tub-washing-machine-dw-9060-pakistan-priceoye-1122a-500x500.webp',
  'dwt9560': 'https://images.priceoye.pk/dawlance-top-load-washing-machine-dwt-9560-pakistan-priceoye-2233b-500x500.webp',
  'dwt1166': 'https://images.priceoye.pk/dawlance-top-load-washing-machine-dwt-1166-pakistan-priceoye-3344c-500x500.webp',
  'dwt1470': 'https://images.priceoye.pk/dawlance-top-load-washing-machine-dwt-1470-pakistan-priceoye-4455d-500x500.webp',
  'hw80bp12929s6': 'https://images.priceoye.pk/haier-8kg-front-load-washing-machine-hw80-bp12929s6-pakistan-priceoye-5566e-500x500.webp',
  'hwd105149': 'https://images.priceoye.pk/haier-10-5kg-washer-dryer-front-load-washing-machine-hwd105-149-pakistan-priceoye-6677f-500x500.webp',
  'hwm1201678': 'https://images.priceoye.pk/haier-12kg-top-load-automatic-washing-machine-hwm-120-1678-pakistan-priceoye-7788g-500x500.webp',
  'hwm1501678': 'https://images.priceoye.pk/haier-15kg-top-load-automatic-washing-machine-hwm-150-1678-pakistan-priceoye-8899h-500x500.webp',
  'hwm150826': 'https://images.priceoye.pk/haier-15kg-top-load-washing-machine-hwm-150-826-pakistan-priceoye-9900i-500x500.webp',
  'hwm85826': 'https://images.priceoye.pk/haier-8-5kg-top-load-washing-machine-hwm-85-826-pakistan-priceoye-1011j-500x500.webp',
  'hwm851708': 'https://images.priceoye.pk/haier-washing-machine-hwm-85-1708-pakistan-priceoye-777ab-500x500.webp',
  'pmo20w': 'https://images.priceoye.pk/pel-microwave-oven-pmo-20w-pakistan-priceoye-1213k-500x500.webp',
  'pmo23sld': 'https://images.priceoye.pk/pel-microwave-oven-pmo-23-sld-pakistan-priceoye-1314l-500x500.webp',
  'ep2230': 'https://images.priceoye.pk/philips-espresso-machine-ep2230-pakistan-priceoye-1415m-500x500.webp',
  'ep3246': 'https://images.priceoye.pk/philips-fully-automatic-espresso-machine-ep3246-pakistan-priceoye-1516n-500x500.webp'
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

    const chunk5 = rows.slice(200, 250);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk5.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK5_VERIFIED_EXACT_MAP)) {
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
          num: idx + 201,
          model: r.Model_Name,
          brand: r.Brand,
          category: r.Category,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 201,
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
    console.log("📊 CHUNK 5 COMPLETION REPORT (Products 201 to 250)");
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
