const fs = require('fs');
const mysql = require('mysql2/promise');

async function main() {
  const mdContent = fs.readFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\all_approved_images.md', 'utf-8');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const lines = mdContent.split('\n');
  let currentRawName = '';
  let updatedCount = 0;

  for (const line of lines) {
    if (line.startsWith('### [ID:')) {
      // Extract the name part: "### [ID: 844] PEL 425 Flat GD Water Dispenser-By Electronics World - PWD-525 GD"
      const match = line.match(/### \[ID: \d+\] (.*)/);
      if (match) {
        currentRawName = match[1].trim();
      }
    } else if (line.startsWith('![') && currentRawName) {
      // Extract image URL
      const imgMatch = line.match(/\!\[.*?\]\((.*?)\)/);
      if (imgMatch) {
        let imageUrl = imgMatch[1];
        if (imageUrl.startsWith('"') && imageUrl.endsWith('"')) {
            imageUrl = imageUrl.slice(1, -1);
        }
        
        if (imageUrl === '217') continue; // Skip broken URLs

        // Try variations of the name
        const variations = [
          currentRawName,
          currentRawName.split(' - ').slice(1).join(' - ').trim(),
          currentRawName.split(' - ').pop().trim(),
        ].filter(Boolean);

        let matchedId = null;

        for (const v of variations) {
          const [rows] = await connection.query("SELECT id FROM products WHERE name = ?", [v]);
          if (rows.length === 1) {
            matchedId = rows[0].id;
            break;
          }
          // Try case insensitive LIKE
          const [rowsLike] = await connection.query("SELECT id FROM products WHERE name LIKE ?", ['%' + v + '%']);
          if (rowsLike.length === 1) {
            matchedId = rowsLike[0].id;
            break;
          }
        }

        if (matchedId) {
          await connection.query("UPDATE products SET image = ? WHERE id = ?", [imageUrl, matchedId]);
          updatedCount++;
          console.log(`✅ Updated ID ${matchedId} for ${currentRawName}`);
        } else {
          console.log(`❌ Could not find product for: ${currentRawName}`);
        }
        currentRawName = ''; // reset
      }
    }
  }

  console.log(`Total images updated in database: ${updatedCount}`);
  await connection.end();
}

main().catch(console.error);
