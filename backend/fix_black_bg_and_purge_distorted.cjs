const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

async function fixBlackBgAndPurgeDistorted() {
  console.log("==================================================");
  console.log("🛠️ FIXING BLACK BACKGROUNDS & PURGING DISTORTED CUTOUTS (NODE)");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`📦 Auditing ${products.length} live products...`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  let fixedBgCount = 0;
  let deletedCount = 0;

  for (const p of products) {
    const imgRel = p.image;
    if (!imgRel.startsWith('/images/products/')) continue;

    const fname = path.basename(imgRel);
    const absPath = path.join(publicDir, fname);

    if (!fs.existsSync(absPath)) {
      await connection.query("DELETE FROM products WHERE id = ?", [p.id]);
      deletedCount++;
      continue;
    }

    const lowerName = (p.name + ' ' + fname).toLowerCase();

    // Check 1: Known distorted / erased / split cutouts shown in screenshots
    if (lowerName.includes('dwt-9560') || lowerName.includes('dwt-1775') || lowerName.includes('dwt 14470') || lowerName.includes('hmw-28100') || lowerName.includes('dw-6550g') || lowerName.includes('dw-6000') || lowerName.includes('wa21ck') || lowerName.includes('wa90ck')) {
      await connection.query("DELETE FROM products WHERE id = ?", [p.id]);
      console.log(`   ❌ Deleted Distorted/Erased Product ID #${p.id} ('${p.name}')`);
      deletedCount++;
      continue;
    }

    // Check 2: Black / Dark background images (Haier HWM 100-316s6, HWM 120-316s6, Gree 18zith1w-t3)
    if (lowerName.includes('316s6') || lowerName.includes('zith1w-t3') || lowerName.includes('tac-24hea')) {
      console.log(`   🎨 Converting Black/Dark BG to Pure White for ID #${p.id} ('${p.name}')`);
      
      // Use PowerShell System.Drawing to replace black pixels with pure white
      const psCode = `
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Bitmap]::FromFile("${absPath.replace(/\\/g, '\\\\')}")
        $newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.Clear([System.Drawing.Color]::White)
        
        for ($y = 0; $y -lt $img.Height; $y++) {
            for ($x = 0; $x -lt $img.Width; $x++) {
                $c = $img.GetPixel($x, $y)
                if ($c.R -gt 35 -or $c.G -gt 35 -or $c.B -gt 35) {
                    $newImg.SetPixel($x, $y, $c)
                }
            }
        }
        $img.Dispose()
        $newImg.Save("${absPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $newImg.Dispose()
      `;
      const psFile = path.join(__dirname, 'fix_bg.ps1');
      fs.writeFileSync(psFile, psCode, 'utf8');
      try {
        execSync('powershell -ExecutionPolicy Bypass -File fix_bg.ps1', { cwd: __dirname });
        fixedBgCount++;
      } catch (e) {}
    }
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");

  console.log("\n==================================================");
  console.log("🎉 BLACK BG FIX & DISTORTION PURGE COMPLETE");
  console.log("==================================================");
  console.log(`✨ Black/Dark Backgrounds Converted to Pure White: ${fixedBgCount}`);
  console.log(`🧹 Distorted/Erased Products Deleted: ${deletedCount}`);
  console.log(`🛒 Total Active Clean Products Remaining in DB: ${finalDbState[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

fixBlackBgAndPurgeDistorted();
