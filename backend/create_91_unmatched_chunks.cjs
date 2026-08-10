const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function createChunks() {
  console.log("==================================================");
  console.log("📦 GENERATING CLEAN CHUNKS FOR ALL 91 UNMATCHED HAIER MODELS");
  console.log("==================================================");

  // Load unmatched refrigerators (24 models)
  const refUnmatchedPath = path.join(__dirname, 'product files', 'Haier_June26_Refrigerator_Still_Unmatched.csv');
  const refUnmatched = [];

  if (fs.existsSync(refUnmatchedPath)) {
    const lines = fs.readFileSync(refUnmatchedPath, 'utf8').split('\n');
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 4 && parts[3] && parts[3] !== 'Model_Name') {
        refUnmatched.push({ brand: 'Haier', category: 'Refrigerators', model: parts[3], mrp: parts[4] || '' });
      }
    });
  }

  // Load unmatched ACs (43 models)
  const acParsedPath = path.join(__dirname, 'haier_ac_parsed.json');
  const acUnmatched = [];

  if (fs.existsSync(acParsedPath)) {
    const data = JSON.parse(fs.readFileSync(acParsedPath, 'utf8'));
    data.forEach(item => {
      const cleanModel = item.model.replace(/^\d+\s+/, '').split(/\s{2,}/)[0].trim();
      acUnmatched.push({ brand: 'Haier', category: 'Air Conditioners', model: cleanModel, mrp: item.mrp || '' });
    });
  }

  // Load unmatched Washing Machines (16 models)
  const wmUnmatched = [
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 60-50 Automatic Dryer', mrp: 38000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 80-60 Semi Automatic', mrp: 35000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 80-1217 Semi Auto', mrp: 39000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 120-35 Semi Auto Single Tub', mrp: 45000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 130-1217 GB Single Tub', mrp: 48000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM-75AS Semi Auto', mrp: 41000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM-80-CS Twin Tub', mrp: 44000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HTW 100-196G Twin Tub', mrp: 52000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HTW 100-196E Twin Tub', mrp: 53000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HMW100-1217 White', mrp: 49000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 80-186 Twin Tub', mrp: 46000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM-85-1269S6 Fully Auto', mrp: 68000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 100-1269 Fully Auto', mrp: 74000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 90-826 E Fully Auto', mrp: 71000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM 100-826 Fully Auto', mrp: 78000 },
    { brand: 'Haier', category: 'Washing Machines', model: 'HWM-110-B688S8 Fully Auto', mrp: 95000 }
  ];

  // Load unmatched Dispensers & Microwaves (8 models)
  const dispMicUnmatched = [
    { brand: 'Haier', category: 'Water Dispensers', model: 'HWD-306 White Glass Door', mrp: 35000 },
    { brand: 'Haier', category: 'Water Dispensers', model: 'HWD-306 Red Glass Door', mrp: 35000 },
    { brand: 'Haier', category: 'Water Dispensers', model: 'HWD-308 Cabinet Dispenser', mrp: 38000 },
    { brand: 'Haier', category: 'Microwave Ovens', model: 'HMW-20MPB 20L Solo Black', mrp: 21000 },
    { brand: 'Haier', category: 'Microwave Ovens', model: 'HWM-26MBH 25L Solo', mrp: 32000 },
    { brand: 'Haier', category: 'Microwave Ovens', model: 'HGL-25MXP9 25L Solo Black', mrp: 29000 },
    { brand: 'Haier', category: 'Microwave Ovens', model: 'HGL-23200 23L Grill White', mrp: 36000 },
    { brand: 'Haier', category: 'Microwave Ovens', model: 'HGL-30100 30L Convection', mrp: 46000 }
  ];

  // Combine all 91 unmatched items
  const all91Unmatched = [
    ...refUnmatched,
    ...acUnmatched,
    ...wmUnmatched,
    ...dispMicUnmatched
  ];

  console.log(`Total Unmatched Haier Models Compiled: ${all91Unmatched.length}`);

  // Create 4 distinct chunks
  const chunk1 = all91Unmatched.slice(0, 24);   // Chunk 1: Refrigerators (24 models)
  const chunk2 = all91Unmatched.slice(24, 46);  // Chunk 2: Air Conditioners Part 1 (22 models)
  const chunk3 = all91Unmatched.slice(46, 67);  // Chunk 3: Air Conditioners Part 2 (21 models)
  const chunk4 = all91Unmatched.slice(67, 91);  // Chunk 4: Washers, Dispensers & Microwaves (24 models)

  const chunksMap = [
    { name: "CHUNK 1 — Refrigerator Unmatched Models (24 Models)", items: chunk1, file: "Haier_Unmatched_Chunk1.csv" },
    { name: "CHUNK 2 — Air Conditioners Unmatched Part 1 (22 Models)", items: chunk2, file: "Haier_Unmatched_Chunk2.csv" },
    { name: "CHUNK 3 — Air Conditioners Unmatched Part 2 (21 Models)", items: chunk3, file: "Haier_Unmatched_Chunk3.csv" },
    { name: "CHUNK 4 — Washing Machines, Dispensers & Microwaves (24 Models)", items: chunk4, file: "Haier_Unmatched_Chunk4.csv" }
  ];

  // Write individual CSV files for each chunk
  chunksMap.forEach(c => {
    const cPath = path.join(__dirname, 'product files', c.file);
    let csvStr = "S_No,Brand,Category,Model_Name,MRP_Price\n";
    c.items.forEach((it, idx) => {
      csvStr += `"${idx+1}","${it.brand}","${it.category}","${it.model.replace(/"/g, '""')}","${it.mrp}"\n`;
    });
    fs.writeFileSync(cPath, csvStr, 'utf8');
  });

  // Save report JSON
  fs.writeFileSync(path.join(__dirname, 'haier_91_unmatched_chunks.json'), JSON.stringify(chunksMap, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("✅ ALL 4 CHUNKS CREATED SUCCESSFULLY!");
  console.log("==================================================");
  console.log(`📦 Chunk 1: 24 Refrigerator Models -> Haier_Unmatched_Chunk1.csv`);
  console.log(`📦 Chunk 2: 22 Air Conditioner Models (Part 1) -> Haier_Unmatched_Chunk2.csv`);
  console.log(`📦 Chunk 3: 21 Air Conditioner Models (Part 2) -> Haier_Unmatched_Chunk3.csv`);
  console.log(`📦 Chunk 4: 24 Washing Machines, Dispensers & Microwaves -> Haier_Unmatched_Chunk4.csv`);
  console.log("==================================================\n");

  process.exit(0);
}

createChunks().catch(console.error);
