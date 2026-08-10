const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeStep3() {
  console.log("==================================================");
  console.log("🛠️ STEP 3 EXECUTION: REMOVING SUSPECTED WRONG/RANDOM IMAGES FROM SITE");
  console.log("🔒 RULE: RESET TO '' (NO_IMAGE STATE), ZERO PLACEHOLDERS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const reportPath = path.join(__dirname, 'suspected_wrong_images.json');
  if (!fs.existsSync(reportPath)) {
    console.log("Error: suspected_wrong_images.json not found.");
    process.exit(1);
  }

  const suspectedList = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log(`Processing STEP 3 image removal for ${suspectedList.length} flagged products...\n`);

  let removedCount = 0;
  const fixedRows = [];

  for (let idx = 0; idx < suspectedList.length; idx++) {
    const item = suspectedList[idx];
    
    // Reset image to empty string "" in DB
    await db.execute('UPDATE products SET image = "" WHERE id = ?', [item.product_id]);
    removedCount++;

    fixedRows.push({
      s_no: idx + 1,
      product_id: item.product_id,
      brand: item.brand,
      product_model: item.product_model,
      category: item.category,
      old_image_url: item.current_image_url,
      new_status: "REMOVED_NO_IMAGE",
      reason_flagged: item.reason_flagged
    });

    console.log(`[${idx+1}/${suspectedList.length}] ❌ [ID ${item.product_id}] ${item.product_model} -> Image Cleared to NO_IMAGE state`);
  }

  // Save to Corrupted_Images_Fixed.csv
  const fixedCsvPath = path.join(__dirname, 'product files', 'Corrupted_Images_Fixed.csv');
  let csvContent = 'S_No,Product_ID,Brand,Product_Model,Category,Old_Image_URL,New_Status,Reason_Flagged\n';

  fixedRows.forEach(r => {
    csvContent += `"${r.s_no}","${r.product_id}","${r.brand.replace(/"/g, '""')}","${r.product_model.replace(/"/g, '""')}","${r.category.replace(/"/g, '""')}","${r.old_image_url.replace(/"/g, '""')}","${r.new_status}","${r.reason_flagged.replace(/"/g, '""')}"\n`;
  });

  fs.writeFileSync(fixedCsvPath, csvContent, 'utf8');

  console.log("\n==================================================");
  console.log(`✅ STEP 3 COMPLETE: Successfully cleared ${removedCount} product images to NO_IMAGE state!`);
  console.log(`📄 Fixed Report CSV saved to: ${fixedCsvPath}`);
  console.log("==================================================");

  await db.end();
}

executeStep3().catch(console.error);
