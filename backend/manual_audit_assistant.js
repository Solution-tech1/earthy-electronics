const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        res.resume();
        resolve(false);
      }
    }).on('error', (err) => resolve(false));
  });
}

function isPlaceholderOrSketch(img) {
  if (!img) return true;
  const lower = img.toLowerCase();
  if (lower.includes('sketch') || lower.includes('drawing') || lower.includes('outline') || lower.includes('bw-')) return true;
  if (lower.match(/product_(ac|fridge|washer|microwave|dispenser)/)) return true;
  return false;
}

async function run() {
  console.log("Starting full audit...");
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT * FROM products ORDER BY id ASC");
  const reportLines = [];
  const hiddenCsvPath = path.join(__dirname, 'Hidden_Due_To_No_Unique_Image.csv');
  
  if (!fs.existsSync(hiddenCsvPath)) {
    fs.writeFileSync(hiddenCsvPath, "ID,Name,Category\n");
  }

  let fixedCount = 0;
  let hiddenCount = 0;
  let groupedCount = 0;

  for (const p of products) {
    // Skip if already processed in the first 40 and not a placeholder, unless we want to re-check all.
    // We will just process everything to ensure complete DB integrity.

    let finalStatus = "";
    let approach = "";
    let verified = "Yes";

    let currentImg = p.image;

    // 1. If remote URL
    if (currentImg && currentImg.startsWith('http')) {
      const cleanUrl = currentImg.split('?')[0];
      const filename = `${p.id}_${path.basename(cleanUrl)}`;
      const destPath = path.join(publicDir, filename);
      
      if (!fs.existsSync(destPath)) {
        const success = await downloadImage(currentImg, destPath);
        if (success) {
          const stats = fs.statSync(destPath);
          if (stats.size > 20000 && !isPlaceholderOrSketch(filename)) {
            await connection.query("UPDATE products SET image = ? WHERE id = ?", [`/images/products/${filename}`, p.id]);
            approach = "Fixed With New Image (CDN Downloaded)";
            finalStatus = "FIXED";
            currentImg = `/images/products/${filename}`;
          } else {
            if(fs.existsSync(destPath)) fs.unlinkSync(destPath);
            currentImg = null;
          }
        } else {
          currentImg = null;
        }
      } else {
        const stats = fs.statSync(destPath);
        if (stats.size > 20000 && !isPlaceholderOrSketch(filename)) {
          await connection.query("UPDATE products SET image = ? WHERE id = ?", [`/images/products/${filename}`, p.id]);
          approach = "Fixed With Local Cache of CDN";
          finalStatus = "FIXED";
          currentImg = `/images/products/${filename}`;
        } else {
          currentImg = null;
        }
      }
    }

    // 2. If valid local image
    if (currentImg && currentImg.startsWith('/images/products/') && !isPlaceholderOrSketch(currentImg)) {
      const absPath = path.join(__dirname, '..', 'frontend', 'public', currentImg);
      if (fs.existsSync(absPath)) {
        const stats = fs.statSync(absPath);
        if (stats.size > 20000) {
          if (!approach) approach = "Fixed With Valid Local Image";
          finalStatus = "FIXED";
        } else {
          currentImg = null;
        }
      } else {
        currentImg = null;
      }
    } else if (currentImg) {
      currentImg = null;
    }

    // 3. Variant Grouping or Hide
    if (!currentImg) {
      const words = p.name.split(' ').slice(0, 2).join(' ');
      const [variants] = await connection.query(
        `SELECT image FROM products 
         WHERE category = ? AND name LIKE ? AND id != ? AND image IS NOT NULL AND image NOT LIKE '%product_%'`,
        [p.category, `${words}%`, p.id]
      );

      let foundVariantImage = null;
      for (const v of variants) {
        if (v.image && !isPlaceholderOrSketch(v.image)) {
           const absPath = path.join(__dirname, '..', 'frontend', 'public', v.image.replace(/^\//, ''));
           if (fs.existsSync(absPath)) {
             foundVariantImage = v.image;
             break;
           }
        }
      }

      if (foundVariantImage) {
        await connection.query("UPDATE products SET image = ? WHERE id = ?", [foundVariantImage, p.id]);
        approach = "Variant Grouped";
        finalStatus = "FIXED";
        groupedCount++;
      } else {
        fs.appendFileSync(hiddenCsvPath, `${p.id},"${p.name}","${p.category}"\n`);
        approach = "Hidden-No Unique Image";
        finalStatus = "UNRESOLVED / HIDDEN";
        // Also update db to set image to null
        await connection.query("UPDATE products SET image = NULL WHERE id = ?", [p.id]);
        hiddenCount++;
      }
    } else {
      fixedCount++;
    }

    reportLines.push(`${p.id} | ${p.name.substring(0, 30)}... | ${approach} | ${finalStatus}`);
  }

  const summary = `
==================================================
📊 FINAL FULL CATALOG AUDIT SUMMARY
==================================================
Total Products Processed : ${products.length}
Successfully Fixed/Local : ${fixedCount}
Variant Grouped (Cards)  : ${groupedCount}
Hidden (No Image/Sketch) : ${hiddenCount}
==================================================`;

  console.log(summary);
  fs.writeFileSync(path.join(__dirname, 'full_audit_report.txt'), reportLines.join('\n') + summary);
  console.log("Detailed report saved to full_audit_report.txt");
  
  await connection.end();
}

run().catch(console.error);
