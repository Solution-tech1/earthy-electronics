const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function deepRemoveBackgrounds() {
  console.log("==================================================");
  console.log("✂️ DEEP BACKGROUND REMOVAL & WHITE CUTOUT ENFORCEMENT");
  console.log("🔒 RULE: REMOVE GREY/BLACK BOXES, WATERMARKS, DELIVERY GRAPHICS & RED BADGES");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products WHERE image != ""');
  console.log(`Processing deep background removal for ${products.length} products...\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  let processedCount = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const imgUrl = p.image.trim();

    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) continue;

    const relativePath = imgUrl.replace(/^\//, '');
    const absPath = path.join(publicDir, relativePath);

    if (!fs.existsSync(absPath)) continue;

    try {
      // 1. Get raw image metrics
      const { data, info } = await sharp(absPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const width = info.width;
      const height = info.height;

      // Sample border pixel colors (corners) to identify background color (grey, black, off-white)
      // Top-left pixel color
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];

      // Pixel loop: If pixel color matches the detected background color (black/grey/off-white) or corner color, turn it transparent!
      const isBgPixel = (r, g, b) => {
        // Pure white or near white
        if (r > 248 && g > 248 && b > 248) return true;
        // Pitch black or near black (like EcoStar pitch black box)
        if (r < 30 && g < 30 && b < 30) return true;
        // Grey box background (like EcoStar grey box #E5E5E5 ~ #F0F0F0)
        if (Math.abs(r - bgR) < 35 && Math.abs(g - bgG) < 35 && Math.abs(b - bgB) < 35) return true;
        // Light grey tint
        if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) return true;
        return false;
      };

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if pixel is a red "Special Price" badge (high R, low G & B)
        if (r > 180 && g < 70 && b < 70) {
          data[i + 3] = 0; // Make red badge transparent
          continue;
        }

        if (isBgPixel(r, g, b)) {
          data[i + 3] = 0; // Make background transparent
        }
      }

      // Convert transparent cutout buffer onto a pure white canvas
      const tempPath = path.join(path.dirname(absPath), `temp_white_${path.basename(absPath)}`);

      await sharp(data, { raw: { width, height, channels: 4 } })
        .trim() // Crop empty transparent borders
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .resize(800, 800, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: 95 })
        .toFile(tempPath);

      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      fs.renameSync(tempPath, absPath);

      processedCount++;
      console.log(`[${idx+1}/${products.length}] ✂️ Deep Whitened: [ID ${p.id}] ${p.name}`);

    } catch (err) {
      console.log(`[${idx+1}/${products.length}] ⚠️ Error processing [ID ${p.id}]: ${err.message}`);
    }
  }

  console.log("\n==================================================");
  console.log("📊 DEEP BACKGROUND REMOVAL COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✂️ Pure White Appliance Cutouts Processed: ${processedCount}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

deepRemoveBackgrounds().catch(console.error);
