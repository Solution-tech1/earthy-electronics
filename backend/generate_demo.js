const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  // Fetch recently approved images (ID >= 735 for this specific recent batch run)
  const [rows] = await c.query("SELECT id, brand, name, image FROM products WHERE id >= 735 AND image LIKE 'http%' LIMIT 20");
  
  let md = '# AI Approved Images Demo\n\nHere are some of the recently approved product images from the ongoing background batch:\n\n';
  
  rows.forEach(r => {
    md += `### [ID: ${r.id}] ${r.brand} - ${r.name}\n`;
    md += `![${r.name}](${r.image})\n\n`;
    md += `---\n\n`;
  });
  
  if (rows.length === 0) {
    md += "No newly approved images found yet. The scraper might be fetching them right now.";
  }
  
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\approved_demo.md', md);
  console.log('Demo file created with ' + rows.length + ' products.');
  await c.end();
}

run().catch(console.error);
