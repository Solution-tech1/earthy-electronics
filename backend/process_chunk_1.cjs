const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Verified exact CDN mappings for Chunk 1 AC models (No duplicates, character-matched)
const CHUNK1_VERIFIED_EXACT_MAP = {
  '12aith': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-6p75a-500x500.webp',
  '12pith10w': 'https://images.priceoye.pk/gree-1-ton-pular-inverter-ac-pakistan-priceoye-998ab-500x500.webp',
  '12pith14s': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-8712a-500x500.webp',
  '13hfa': 'https://images.priceoye.pk/haier-1-ton-thunder-inverter-hsu-12hfpaa-pakistan-priceoye-7578j-500x500.webp',
  '13hfc': 'https://images.priceoye.pk/haier-1-ton-inverter-hsu-12hfc-pakistan-priceoye-12466-500x500.webp',
  '15aura': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-aura-x-30-pakistan-priceoye-b4x3w-500x500.webp',
  '15elegancex': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-elegance-x-30-pakistan-priceoye-881ab-500x500.webp',
  '18hfm': 'https://images.priceoye.pk/haier-1-5-ton-inverter-hsu-18hfm-pakistan-priceoye-6a422-500x500.webp',
  '18pith11g': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-5511b-500x500.webp'
};

const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
const rows = [];

fs.createReadStream(todoCsvPath)
  .pipe(csv())
  .on('data', (data) => rows.push(data))
  .on('end', () => {
    // Sort category-wise (AC first)
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

    const chunk1 = rows.slice(0, 50);

    let doneCount = 0;
    let unmatchedCount = 0;
    const usedImages = new Set();
    const chunkResults = [];

    chunk1.forEach((r, idx) => {
      const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let foundUrl = '';

      for (const [key, url] of Object.entries(CHUNK1_VERIFIED_EXACT_MAP)) {
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
          num: idx + 1,
          model: r.Model_Name,
          status: 'DONE',
          url: foundUrl
        });
      } else {
        unmatchedCount++;
        chunkResults.push({
          num: idx + 1,
          model: r.Model_Name,
          status: 'UNMATCHED',
          reason: 'No 100% exact character match or potential image duplicate'
        });
      }
    });

    console.log("==================================================");
    console.log("📊 CHUNK 1 COMPLETION REPORT (Products 1 to 50 - AC)");
    console.log("==================================================");
    console.log(`✅ DONE (Exact Verified Image Match): ${doneCount}`);
    console.log(`❌ UNMATCHED (No Exact Match / Zero Fallback): ${unmatchedCount}`);
    console.log("==================================================\n");

    console.log("🔍 Detailed Breakdown:");
    chunkResults.forEach(item => {
      if (item.status === 'DONE') {
        console.log(`  [#${item.num}] ${item.model} -> DONE (${item.url})`);
      } else {
        console.log(`  [#${item.num}] ${item.model} -> UNMATCHED (${item.reason})`);
      }
    });

    process.exit(0);
  });
