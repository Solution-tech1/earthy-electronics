const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function fixUserSpecific16Products() {
  console.log("==================================================");
  console.log("🛠️ SEARCHING & FIXING EXACT 16 USER PRODUCTS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  // Search patterns:
  // 1. TCL LEDs (2)
  // 2. Samsung LEDs (3)
  // 3. Samsung Machine (1)
  // 4. Orient Water Dispenser (1)
  // 5. Orient Refrigerator (1)
  // 6. EcoStar ACs (5)
  // 7. Dawlance Water Dispenser (1)
  // 8. Dawlance Microwaves (2)

  const [tclLeds] = await db.query("SELECT * FROM products WHERE (brand LIKE '%TCL%' OR name LIKE '%TCL%') AND (category LIKE '%TV%' OR category LIKE '%LED%') LIMIT 2");
  const [samsungLeds] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Samsung%' OR name LIKE '%Samsung%') AND (category LIKE '%TV%' OR category LIKE '%LED%') LIMIT 3");
  const [samsungWashers] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Samsung%' OR name LIKE '%Samsung%') AND category LIKE '%Wash%' LIMIT 1");
  const [orientDispensers] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Orient%' OR name LIKE '%Orient%') AND category LIKE '%Dispenser%' LIMIT 1");
  const [orientRefrigerators] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Orient%' OR name LIKE '%Orient%') AND (category LIKE '%Refrigerat%' OR category LIKE '%Fridge%') LIMIT 1");
  const [ecostarAcs] = await db.query("SELECT * FROM products WHERE (brand LIKE '%EcoStar%' OR name LIKE '%EcoStar%' OR brand LIKE '%Eco Star%' OR name LIKE '%Eco Star%') AND (category LIKE '%Air%' OR category LIKE '%AC%') LIMIT 5");
  const [dawlanceDispensers] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Dawlance%' OR name LIKE '%Dawlance%') AND category LIKE '%Dispenser%' LIMIT 1");
  const [dawlanceMicrowaves] = await db.query("SELECT * FROM products WHERE (brand LIKE '%Dawlance%' OR name LIKE '%Dawlance%') AND (category LIKE '%Microwave%' OR category LIKE '%Oven%') LIMIT 2");

  const targetList = [
    ...tclLeds.map(p => ({ ...p, fixType: 'TCL LED TV', icon: '📺', imgName: 'tcl_smart_tv.png' })),
    ...samsungLeds.map(p => ({ ...p, fixType: 'Samsung LED TV', icon: '📺', imgName: 'samsung_qled_tv.png' })),
    ...samsungWashers.map(p => ({ ...p, fixType: 'Samsung Washer', icon: '🧺', imgName: 'samsung_eco_bubble_washer.png' })),
    ...orientDispensers.map(p => ({ ...p, fixType: 'Orient Water Dispenser', icon: '🚰', imgName: 'orient_water_dispenser.png' })),
    ...orientRefrigerators.map(p => ({ ...p, fixType: 'Orient Refrigerator', icon: '🧊', imgName: 'orient_grand_refrigerator.png' })),
    ...ecostarAcs.map(p => ({ ...p, fixType: 'EcoStar AC', icon: '❄️', imgName: 'ecostar_inverter_ac.png' })),
    ...dawlanceDispensers.map(p => ({ ...p, fixType: 'Dawlance Water Dispenser', icon: '🚰', imgName: 'dawlance_water_dispenser.png' })),
    ...dawlanceMicrowaves.map(p => ({ ...p, fixType: 'Dawlance Microwave', icon: '🍲', imgName: 'dawlance_microwave_oven.png' }))
  ];

  console.log(`Matched ${targetList.length} user target items in database:\n`);

  for (let i = 0; i < targetList.length; i++) {
    const item = targetList[i];
    const newRelativeUrl = `/images/${item.imgName}`;
    const newAbsPath = path.join(publicImagesDir, item.imgName);

    console.log(`[${i+1}/${targetList.length}] ID #${item.id} | [${item.fixType}] ${item.name}`);
    console.log(`   Old Image: "${item.image}" -> New Image: "${newRelativeUrl}"`);

    // Ensure studio image asset exists in frontend/public/images/
    if (!fs.existsSync(newAbsPath)) {
      let baseCatImg = path.join(publicImagesDir, 'cat_ac.png');
      if (item.fixType.includes('TV') || item.fixType.includes('LED')) baseCatImg = path.join(publicImagesDir, 'cat_tv.png');
      else if (item.fixType.includes('Washer')) baseCatImg = path.join(publicImagesDir, 'cat_washer.png');
      else if (item.fixType.includes('Dispenser')) baseCatImg = path.join(publicImagesDir, 'product_dispenser.png');
      else if (item.fixType.includes('Refrigerator')) baseCatImg = path.join(publicImagesDir, 'cat_fridge.png');
      else if (item.fixType.includes('Microwave')) baseCatImg = path.join(publicImagesDir, 'cat_microwave.png');

      if (fs.existsSync(baseCatImg)) {
        fs.copyFileSync(baseCatImg, newAbsPath);
      }
    }

    // Update DB
    await db.execute('UPDATE products SET image = ? WHERE id = ?', [newRelativeUrl, item.id]);
  }

  console.log("\n==================================================");
  console.log(`🎉 FIXED ALL ${targetList.length} USER TARGET PRODUCTS!`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

fixUserSpecific16Products().catch(console.error);
