const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importAllCatalogProductsClean() {
  console.log("==================================================");
  console.log("🚀 IMPORTING ALL CATALOG PRODUCTS INTO MARIADB WITH CLEAN CATEGORIES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const folder = path.join(__dirname, 'all products files');
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.csv') || f.endsWith('.csv.csv'));

  console.log(`📁 Found ${files.length} CSV files to process:`, files);

  const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const availableImages = fs.readdirSync(publicImagesDir);

  let insertedCount = 0;

  for (const file of files) {
    const filePath = path.join(folder, file);
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length < 2) continue;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map(s => s.replace(/"/g, '').trim());

      let title = parts[1] || parts[0] || parts[3];
      if (!title || title.length < 4 || title.toUpperCase().includes('TOTAL') || title.toUpperCase().includes('PRODUCT UPLOADED') || title.toUpperCase().includes('MODEL IN LIST')) {
        continue;
      }

      // Determine true brand
      let brand = parts[0] || 'Generic';
      if (title.toUpperCase().includes('DAWLANCE')) brand = 'Dawlance';
      else if (title.toUpperCase().includes('HAIER')) brand = 'Haier';
      else if (title.toUpperCase().includes('GREE')) brand = 'Gree';
      else if (title.toUpperCase().includes('ORIENT')) brand = 'Orient';
      else if (title.toUpperCase().includes('PEL')) brand = 'PEL';
      else if (title.toUpperCase().includes('WESTPOINT') || title.toUpperCase().includes('WEST POINT')) brand = 'WestPoint';
      else if (title.toUpperCase().includes('SAMSUNG')) brand = 'Samsung';
      else if (title.toUpperCase().includes('TCL')) brand = 'TCL';
      else if (title.toUpperCase().includes('ECOSTAR')) brand = 'EcoStar';
      else if (title.toUpperCase().includes('KENWOOD')) brand = 'Kenwood';
      else if (title.toUpperCase().includes('HOMAGE')) brand = 'Homage';
      else if (title.toUpperCase().includes('PHILIPS')) brand = 'Philips';

      // Determine true category
      const fullText = (title + ' ' + (parts[2] || '') + ' ' + file).toLowerCase();
      let category = 'Kitchen Appliances';

      if (fullText.includes('washer') || fullText.includes('washing') || fullText.includes('hwm') || fullText.includes('dwt') || fullText.includes('dw-') || fullText.includes('w-m') || fullText.includes('twin tub') || fullText.includes('single tub') || fullText.includes('dryer') || fullText.includes('spinner')) {
        category = 'Washing Machines';
      } else if (fullText.includes('microwave') || fullText.includes('oven') || fullText.includes('m-w') || fullText.includes('hmw-') || fullText.includes('hgl') || fullText.includes('hmn') || fullText.includes('pmo-')) {
        category = 'Microwave Ovens';
      } else if (fullText.includes('refriger') || fullText.includes('fridge') || fullText.includes('hrf-') || fullText.includes('freezer')) {
        category = 'Refrigerators';
      } else if (fullText.includes('dispenser') || fullText.includes('w-d')) {
        category = 'Water Dispensers';
      } else if (fullText.includes('tv') || fullText.includes('led') || fullText.includes('qled') || fullText.includes('oled')) {
        category = 'LED TVs';
      } else if (fullText.includes('air conditioner') || fullText.includes('split ac') || fullText.includes('inverter ac') || fullText.includes('ac ') || fullText.includes('hsu-') || fullText.includes('gs-') || fullText.includes('zith')) {
        category = 'Air Conditioners';
      }

      // Determine price
      let price = 45000;
      for (const p of parts) {
        const num = parseInt(p.replace(/[^0-9]/g, ''));
        if (num >= 8000 && num <= 500000) {
          price = num;
          break;
        }
      }
      const discountPrice = Math.round(price * 0.94);

      // Find matching clean image on disk
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedImg = availableImages.find(img => {
        const cleanImg = img.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanImg.includes(cleanTitle) || cleanTitle.includes(cleanImg);
      });

      let imagePath = matchedImg ? `/images/products/${matchedImg}` : null;

      // Avoid duplicate title rows
      const [existing] = await connection.query("SELECT id FROM products WHERE name = ?", [title]);
      if (existing.length === 0) {
        await connection.query(
          "INSERT INTO products (name, brand, category, price, discountPrice, image, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 10, NOW())",
          [title, brand, category, price, discountPrice, imagePath, `Official ${brand} ${title} with official warranty.`]
        );
        insertedCount++;
      }
    }
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");
  const [catSummary] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");

  console.log("\n==================================================");
  console.log("🎉 ALL CATALOG PRODUCTS IMPORTED SUCCESSFULLY");
  console.log("==================================================");
  console.log(`✨ Total New Products Imported: ${insertedCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${finalDbState[0].total}`);
  console.log(`📸 Products with Active Images: ${finalDbState[0].with_image}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ LIVE CATEGORIES BREAKDOWN:");
  catSummary.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

importAllCatalogProductsClean();
