require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function exportProductsByCategory() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [products] = await db.query('SELECT * FROM products ORDER BY category, name');
  console.log(`Total live products to export: ${products.length}`);

  const outDir = path.join(__dirname, 'products_by_category');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const byCat = {};
  for (const p of products) {
    const cat = p.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(p);
  }

  Object.entries(byCat).forEach(([cat, list]) => {
    const fileName = cat.replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    const filePath = path.join(outDir, fileName);

    let csvContent = 'ID,Name,Brand,Category,Price,DiscountPrice,Image_URL\n';
    list.forEach(item => {
      const name = `"${(item.name || '').replace(/"/g, '""')}"`;
      const brand = `"${(item.brand || '').replace(/"/g, '""')}"`;
      const category = `"${(item.category || '').replace(/"/g, '""')}"`;
      const image = `"${(item.image || '').replace(/"/g, '""')}"`;
      csvContent += `${item.id},${name},${brand},${category},${item.price},${item.discountPrice || item.price},${image}\n`;
    });

    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`[${list.length}] ${cat} -> ${fileName}`);
  });

  console.log(`\n=============================\nTOTAL PRODUCTS EXPORTED: ${products.length}\nOUTPUT FOLDER: backend/products_by_category/\n=============================`);
  process.exit(0);
}

exportProductsByCategory().catch(console.error);
