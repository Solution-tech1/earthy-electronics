const mysql = require('mysql2/promise');

async function fixAllProductCategoriesCorrectly() {
  console.log("==================================================");
  console.log("🛠️ CORRECTING ALL DB PRODUCT CATEGORY ASSIGNMENTS");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category FROM products");
  console.log(`Auditing ${products.length} products...`);

  let updatedCount = 0;

  for (const p of products) {
    const text = (p.name + ' ' + (p.category || '')).toLowerCase();
    let correctCat = p.category;

    if (text.includes('washer') || text.includes('washing') || text.includes('hwm') || text.includes('dwt') || text.includes('dw-') || text.includes('twin tub') || text.includes('single tub') || text.includes('dryer')) {
      correctCat = 'Washing Machines';
    } else if (text.includes('microwave') || text.includes('oven') || text.includes('hmw-') || text.includes('hgl') || text.includes('hmn') || text.includes('pmo-')) {
      correctCat = 'Microwave Ovens';
    } else if (text.includes('refriger') || text.includes('fridge') || text.includes('hrf-') || text.includes('freezer')) {
      correctCat = 'Refrigerators';
    } else if (text.includes('dispenser')) {
      correctCat = 'Water Dispensers';
    } else if (text.includes('espresso') || text.includes('fryer') || text.includes('kitchen') || text.includes('blender') || text.includes('juicer')) {
      correctCat = 'Kitchen Appliances';
    } else if (text.includes('air conditioner') || text.includes('split ac') || text.includes('inverter ac') || text.includes('ac ') || text.includes('hsu-') || text.includes('gs-') || text.includes('zith')) {
      correctCat = 'Air Conditioners';
    }

    if (correctCat !== p.category) {
      await connection.query("UPDATE products SET category = ? WHERE id = ?", [correctCat, p.id]);
      console.log(`   ✏️ Updated ID #${p.id} ("${p.name}"): '${p.category}' ➔ '${correctCat}'`);
      updatedCount++;
    }
  }

  const [catSummary] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");
  console.log("\n==================================================");
  console.log("🎉 CATEGORY CORRECTION COMPLETE");
  console.log("==================================================");
  console.log(`✨ Total Products Re-categorized: ${updatedCount}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ UPDATED CATEGORIES BREAKDOWN:");
  catSummary.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

fixAllProductCategoriesCorrectly();
