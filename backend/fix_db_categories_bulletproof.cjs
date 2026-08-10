const mysql = require('mysql2/promise');

function getCleanCategory(p) {
  const cat = (p.category || '').toLowerCase();
  const name = (p.name || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();
  const text = `${cat} ${name} ${brand}`;

  // 1. TVs & Displays
  if (text.includes('tv') || text.includes('led') || text.includes('qled') || text.includes('oled') || text.includes('uhd') || text.includes('voxin')) {
    return 'LED TVs';
  }

  // 2. Water Dispensers
  if (text.includes('dispenser') || text.includes('water dispenser') || text.includes('taps')) {
    return 'Water Dispensers';
  }

  // 3. Deep Freezers
  if (text.includes('freezer') || text.includes('chest freezer') || text.includes('deep freezer')) {
    return 'Deep Freezers';
  }

  // 4. Geysers & Heaters
  if (text.includes('geyser') || text.includes('water heater') || text.includes('room heater') || text.includes('quartz heater')) {
    return 'Geysers & Water Heaters';
  }

  // 5. Microwave Ovens (CHECK BEFORE AC/WASHER TO PREVENT OVEN CONFLICT)
  if (text.includes('microwave') || text.includes('oven') || text.includes('hmw-') || text.includes('hmn-') || text.includes('hgl-') || text.includes('dw-115') || text.includes('dw-131') || text.includes('dw-142') || text.includes('hdg-') || text.includes('popcorn')) {
    return 'Microwave Ovens';
  }

  // 6. Washing Machines (CHECK BEFORE AC)
  if (text.includes('washing') || text.includes('washer') || text.includes('spinner') || text.includes('single tub') || text.includes('twin tub') || text.includes('top load') || text.includes('front load') || text.includes('dryer') || text.includes('hwm') || text.includes('dwt') || text.includes('htw') || text.includes('advanco') || text.includes('ds-') || text.includes('dw-65') || text.includes('dw-75') || text.includes('dw-85') || text.includes('dw-90') || text.includes('dw-105')) {
    return 'Washing Machines';
  }

  // 7. Refrigerators
  if (text.includes('fridge') || text.includes('refriger') || text.includes('hrf') || text.includes('cft') || text.includes('direct cool') || text.includes('no frost')) {
    return 'Refrigerators';
  }

  // 8. Air Conditioners
  if (text.includes('air conditioner') || text.includes('split ac') || text.includes('inverter ac') || text.includes('ton') || text.includes('hsu-') || text.includes('tac-') || text.includes('pith') || text.includes('aith') || text.includes('aura x') || text.includes('kgp-') || text.includes('glory') || text.includes('onyx') || text.includes('eoasis') || text.includes('chillex') || text.includes('cruise')) {
    return 'Air Conditioners';
  }

  return 'Kitchen Appliances';
}

async function fixDbCategories() {
  console.log("==================================================");
  console.log("🛠️ BULLETPROOF DB CATEGORY RE-CLASSIFICATION");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand FROM products');
  console.log(`Processing ${products.length} products...\n`);

  const categoryCounts = {};

  for (const p of products) {
    const cleanCat = getCleanCategory(p);
    await db.execute('UPDATE products SET category = ? WHERE id = ?', [cleanCat, p.id]);
    categoryCounts[cleanCat] = (categoryCounts[cleanCat] || 0) + 1;
  }

  console.log("==================================================");
  console.log("📊 BULLETPROOF CATEGORY BREAKDOWN IN DATABASE");
  console.log("==================================================");
  Object.keys(categoryCounts).forEach(cat => {
    console.log(`   - "${cat}": ${categoryCounts[cat]} products`);
  });
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

fixDbCategories().catch(console.error);
