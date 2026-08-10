const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function auditAndCleanCorruptedImages() {
  console.log("==================================================");
  console.log("🧹 AUDITING & CLEANING ALL UNRELATED / CORRUPTED IMAGES ACROSS THE SITE");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products');
  console.log(`Total Active Products in Database: ${products.length}\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const corruptedList = [];
  let totalCleared = 0;

  for (const p of products) {
    const rawImgPath = p.image || '';
    let isCorrupt = false;
    let reason = '';

    if (!rawImgPath || rawImgPath.trim() === '') {
      continue;
    }

    if (rawImgPath.startsWith('http')) {
      // Remote Bing/Google thumbnail URL -> purge immediately per Golden Rule
      isCorrupt = true;
      reason = "Remote search thumbnail link removed";
    } else {
      const absPath = path.join(publicDir, rawImgPath.replace(/^\//, ''));

      if (!fs.existsSync(absPath)) {
        isCorrupt = true;
        reason = "File missing on disk";
      } else {
        try {
          const metadata = await sharp(absPath).metadata();
          // Check if aspect ratio or file size indicates non-appliance thumbnail or corruption
          const stat = fs.statSync(absPath);

          if (stat.size < 1500) {
            isCorrupt = true;
            reason = `File size too small (${stat.size} bytes)`;
          } else if (metadata.width < 100 || metadata.height < 100) {
            isCorrupt = true;
            reason = `Low resolution thumbnail (${metadata.width}x${metadata.height})`;
          } else {
            // Check if recently generated from Bing search (which fetched random Bing thumbnails)
            const basename = path.basename(absPath).toLowerCase();
            if (basename.includes('temp_b_') || basename.includes('temp_clean_') || basename.includes('temp_bp_')) {
              isCorrupt = true;
              reason = "Unverified web thumbnail image";
            }
          }
        } catch (err) {
          isCorrupt = true;
          reason = `Corrupt image file (${err.message})`;
        }
      }
    }

    if (isCorrupt) {
      // Clear image in DB -> set to empty string ""
      await db.execute('UPDATE products SET image = "" WHERE id = ?', [p.id]);
      totalCleared++;

      corruptedList.push({
        s_no: totalCleared,
        product_id: p.id,
        brand: p.brand || '',
        model: p.name,
        category: p.category || '',
        old_image_path: rawImgPath,
        new_status: "REMOVED_NO_IMAGE",
        reason
      });

      console.log(`❌ [ID ${p.id}] ${p.name} -> Image Cleared (${reason})`);
    }
  }

  // Create CSV file "Corrupted_Images_Fixed.csv"
  const csvPath = path.join(__dirname, 'product files', 'Corrupted_Images_Fixed.csv');
  let csvContent = 'S_No,Product_ID,Brand,Product_Model,Category,Old_Image_Path,New_Status,Reason\n';

  corruptedList.forEach(r => {
    csvContent += `"${r.s_no}","${r.product_id}","${r.brand.replace(/"/g, '""')}","${r.model.replace(/"/g, '""')}","${r.category.replace(/"/g, '""')}","${r.old_image_path.replace(/"/g, '""')}","${r.new_status}","${r.reason.replace(/"/g, '""')}"\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf8');

  console.log("\n==================================================");
  console.log(`✅ TOTAL CORRUPTED / UNRELATED IMAGES REMOVED: ${totalCleared}`);
  console.log(`📄 Report saved to: ${csvPath}`);
  console.log("==================================================");

  await db.end();
}

auditAndCleanCorruptedImages().catch(console.error);
