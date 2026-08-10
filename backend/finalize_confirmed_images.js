const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});

  // 1. First, we ensure all products are set to NULL if they are not AI verified
  // We won't wipe the AI verified ones.
  await c.query("UPDATE products SET image = NULL WHERE image NOT LIKE '/images/products/m5_%' AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%'");
  
  // 2. Restore 40 Friend Products
  const reportPath = path.join(__dirname, 'matched_40_user_images_report.json');
  if (fs.existsSync(reportPath)) {
    const items = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    for(const item of items) {
      if (item.status === 'MATCHED_AND_VERIFIED') {
        const name = `${item.brand} ${item.model}`.trim();
        await c.query("UPDATE products SET image = ? WHERE name = ?", [item.targetPath, name]);
      }
    }
    console.log("Restored 40 Friend Batch Images.");
  }

  // 3. Restore 73 LED/Dispenser Products
  const readyCsvPath = path.join(__dirname, 'product files', 'Products_WITH_Images_READY.csv');
  if (fs.existsSync(readyCsvPath)) {
    const text = fs.readFileSync(readyCsvPath, 'utf8');
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('S_No'));
    for(const l of lines) {
      const parts = l.split(',');
      if (parts.length >= 7) {
        const rawName = parts[3].replace(/[^\x00-\x7F]/g, ' ').trim();
        const url = parts[6].replace(/[^\x00-\x7F]/g, '').trim();
        if (url && !url.startsWith('data:image')) { // Rejecting Group 4 Base64 here!
          // Match by name
          await c.query("UPDATE products SET image = ? WHERE name = ?", [url, rawName]);
        }
      }
    }
    console.log("Restored LED/Dispenser (Ready) Images. Base64 rejected automatically.");
  }

  // 4. Fix Group 9 Names (Gree Pular vs Fairy) so they don't group together
  // Update name to move Series to the front so the first 3 words are different
  await c.query("UPDATE products SET name = REPLACE(name, 'GREE Split AC 1 TON Pular Series', 'GREE Pular Split AC 1 TON') WHERE name LIKE '%Pular%' AND name LIKE '%GREE Split AC%'");
  await c.query("UPDATE products SET name = REPLACE(name, 'GREE Split AC 2 TON (Inverter) Fairy Series', 'GREE Fairy Split AC 2 TON (Inverter)') WHERE name LIKE '%Fairy%' AND name LIKE '%GREE Split AC%'");
  await c.query("UPDATE products SET name = REPLACE(name, 'GREE Split AC 1.5 TON Fairy Series', 'GREE Fairy Split AC 1.5 TON') WHERE name LIKE '%Fairy%' AND name LIKE '%GREE Split AC%'");
  await c.query("UPDATE products SET name = REPLACE(name, 'GREE Split AC 2 TON Fairy Series', 'GREE Fairy Split AC 2 TON') WHERE name LIKE '%Fairy%' AND name LIKE '%GREE Split AC%'");
  console.log("Fixed Group 9 Gree names for correct Variant Grouping isolation.");

  // Hide Group 4 (any lingering base64)
  await c.query("UPDATE products SET image = NULL WHERE image LIKE 'data:image%'");

  // Output current confirmed total
  const [total] = await c.query("SELECT COUNT(*) as count FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%'");
  console.log(`\n🎉 Total Confirmed Products with Unique/Valid Images: ${total[0].count}`);

  await c.end();
}

run().catch(console.error);
