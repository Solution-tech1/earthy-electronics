const mysql = require('mysql2/promise');

function getCleanCategory(p) {
  const cat = (p.category || '').toLowerCase();
  const name = (p.name || '').toLowerCase();

  if (cat.includes('air') || cat.includes('ac') || name.includes('air conditioner') || name.includes('inverter ac') || name.includes('split ac') || name.includes('hsu-')) {
    return 'Air Conditioners';
  }
  if (cat.includes('wash') || cat.includes('wm') || name.includes('washing') || name.includes('washer') || name.includes('hwm') || name.includes('dwt')) {
    return 'Washing Machines';
  }
  if (cat.includes('refrig') || cat.includes('fridge') || name.includes('refrigerator') || name.includes('fridge') || name.includes('hrf-')) {
    return 'Refrigerators';
  }
  if (cat.includes('micro') || cat.includes('oven') || name.includes('microwave') || name.includes('hmw-') || name.includes('hmn-')) {
    return 'Microwave Ovens';
  }
  if (cat.includes('tv') || cat.includes('led') || name.includes('smart tv') || name.includes('led tv') || name.includes('qled')) {
    return 'LED TVs';
  }
  if (cat.includes('dispen') || name.includes('dispenser')) {
    return 'Water Dispensers';
  }
  if (cat.includes('freez') || name.includes('freezer')) {
    return 'Deep Freezers';
  }
  if (cat.includes('geyser') || cat.includes('heater') || name.includes('geyser') || name.includes('water heater')) {
    return 'Geysers & Water Heaters';
  }
  return p.category || 'Kitchen Appliances';
}

async function normalizeCategories() {
  console.log("==================================================");
  console.log("🛠️ NORMALIZING ALL PRODUCT CATEGORIES IN DATABASE");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category FROM products');
  console.log(`Processing ${products.length} products...\n`);

  const categoryCounts = {};

  for (const p of products) {
    const cleanCat = getCleanCategory(p);
    await db.execute('UPDATE products SET category = ? WHERE id = ?', [cleanCat, p.id]);
    categoryCounts[cleanCat] = (categoryCounts[cleanCat] || 0) + 1;
  }

  console.log("==================================================");
  console.log("📊 DATABASE CATEGORY NORMALIZATION COMPLETE SUMMARY");
  console.log("==================================================");
  Object.keys(categoryCounts).forEach(cat => {
    console.log(`   - "${cat}": ${categoryCounts[cat]} products`);
  });
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

normalizeCategories().catch(console.error);
