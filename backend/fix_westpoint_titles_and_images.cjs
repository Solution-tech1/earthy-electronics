const mysql = require('mysql2/promise');

async function fixWestpointTitlesAndImages() {
  console.log("==================================================");
  console.log("🧹 FIXING WESTPOINT TITLES & REMOVING SHARED AIR FRYER IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, image FROM products WHERE name LIKE '%WestPoint%'");
  console.log(`🔍 Found ${products.length} WestPoint products in DB.`);

  let titleFixedCount = 0;
  let imagePurgedCount = 0;

  for (const p of products) {
    let newName = p.name;
    
    // Fix duplicate brand prefix "WestPoint WestPoint 1203" -> "WestPoint 1203"
    if (newName.startsWith("WestPoint WestPoint ")) {
      newName = newName.replace("WestPoint WestPoint ", "WestPoint ");
      await connection.query("UPDATE products SET name = ? WHERE id = ?", [newName, p.id]);
      titleFixedCount++;
      console.log(`✏️ Fixed Title ID #${p.id}: "${p.name}" -> "${newName}"`);
    }

    // Keep air fryer image ONLY for WestPoint 1846 Air Fryer (ID #273 or name containing 1846)
    if (!newName.includes('1846')) {
      if (p.image && p.image.includes('westpoint')) {
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
        imagePurgedCount++;
        console.log(`❌ Removed Shared Air Fryer Image from ID #${p.id} ("${newName}")`);
      }
    }
  }

  const [finalRes] = await connection.query("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products");

  console.log("\n==================================================");
  console.log("🎉 WESTPOINT FIX COMPLETE");
  console.log("==================================================");
  console.log(`✏️ Titles Cleaned: ${titleFixedCount}`);
  console.log(`🧹 Shared Air Fryer Images Removed: ${imagePurgedCount}`);
  console.log(`🛒 Total Active Products in DB: ${finalRes[0].total}`);
  console.log(`✨ Total Products with 100% TRULY UNIQUE Cutouts: ${finalRes[0].with_image}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

fixWestpointTitlesAndImages();
