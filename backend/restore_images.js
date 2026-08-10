const fs = require('fs');
const mysql = require('mysql2/promise');

async function restore() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  
  const csvContent = fs.readFileSync('e:/earthyelectronics/backend/product files/Products_WITH_Images_READY.csv', 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  
  let restoredCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Quick heuristic: the image URL is always the second to last column, or we can just find the part that starts with http
    const parts = line.split(',');
    
    let imageUrl = parts.find(p => p.trim().startsWith('http'));
    let name = parts[3]; // Best effort, but let's try matching by model instead if name has commas
    let brand = parts[1] ? parts[1].trim() : '';
    let category = parts[2] ? parts[2].trim() : '';
    
    // If the image column contains a URL, let's restore it
    if (imageUrl) {
      // Find the product by brand and category, using a LIKE query on the name to be safe
      // Actually, since dedup kept the LOWER ID, the easiest way is to match by name or model.
      // Let's use model as it's more unique and less likely to have commas. The model is usually parts[4] or just before price.
      let priceIndex = parts.findIndex(p => !isNaN(p) && p.length > 3 && !p.startsWith('http'));
      let model = priceIndex > 0 ? parts[priceIndex - 1] : '';
      
      let queryStr = '';
      let queryParams = [];
      
      if (model && model.length > 2) {
         queryStr = 'SELECT id FROM products WHERE name LIKE ? AND category LIKE ? LIMIT 1';
         queryParams = ['%' + model.replace(/-/g, '%') + '%', '%' + category + '%'];
      } else {
         queryStr = 'SELECT id FROM products WHERE brand = ? AND category = ? LIMIT 1';
         queryParams = [brand, category];
      }
      
      const [rows] = await c.query(queryStr, queryParams);
      if (rows.length > 0) {
        try {
          await c.query('UPDATE products SET image = ? WHERE id = ?', [imageUrl.trim(), rows[0].id]);
          restoredCount++;
        } catch(e) {
          console.error(`Failed to update id ${rows[0].id}: ${e.message}`);
        }
      }
    }
  }
  
  console.log(`Successfully restored images for ${restoredCount} products from backup!`);
  await c.end();
}
restore().catch(console.error);
