const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [rows] = await c.query('SELECT id, brand, category, name, image FROM products WHERE image IS NULL OR image = "NO_IMAGE_FOUND" OR image LIKE "/images/cat_%"');
  
  let csv = 'Product_ID,Brand,Category,Model_Name,Reason,Last_Attempted_Source\n';
  
  let countNoImage = 0;
  let countNotAttempted = 0;

  rows.forEach(r => {
    let reason = "NOT_YET_ATTEMPTED";
    if (r.image === "NO_IMAGE_FOUND") {
      reason = "NO_IMAGE_FOUND";
      countNoImage++;
    } else {
      countNotAttempted++;
    }
    
    // escape quotes in names
    const safeName = r.name ? r.name.replace(/"/g, '""') : '';
    csv += `"${r.id}","${r.brand}","${r.category}","${safeName}","${reason}",""\n`;
  });

  fs.writeFileSync('e:/earthyelectronics/Remaining_Products_Status.csv', csv);
  console.log(`CSV Created with ${rows.length} rows.`);
  console.log(`NO_IMAGE_FOUND: ${countNoImage}`);
  console.log(`NOT_YET_ATTEMPTED: ${countNotAttempted}`);
  
  await c.end();
}
run();
