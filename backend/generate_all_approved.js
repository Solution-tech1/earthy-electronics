const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });
  
  const [rows] = await con.execute("SELECT id, brand, name, image FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' AND image NOT LIKE '/images/product_%' ORDER BY id ASC");
  
  let md = '# All Saved Product Images\n\nPlease review all the images below. Note down the **ID numbers** of any images that show the product in a cardboard box (or any other bad images) and let me know so I can delete them.\n\n';
  
  rows.forEach(r => {
    md += `### [ID: ${r.id}] ${r.brand} - ${r.name}\n![${r.name}](${r.image})\n\n---\n\n`;
  });
  
  const path = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\all_approved_images.md';
  fs.writeFileSync(path, md);
  console.log('Generated all_approved_images.md with ' + rows.length + ' items');
  await con.end();
}

run().catch(console.error);
