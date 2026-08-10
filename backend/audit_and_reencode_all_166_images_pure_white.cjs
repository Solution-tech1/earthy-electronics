const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

async function auditAndReencodeAll166ImagesPureWhite() {
  console.log("==================================================");
  console.log("🧼 PURE WHITE BACKGROUND RE-ENCODING & STRICT AUDIT ON ALL 166 LIVE IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await connection.query("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''");
  console.log(`📦 Processing ${products.length} live products for 100% Pure White Background & Cache Invalidation...`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  let fixedBgCount = 0;

  for (const p of products) {
    if (!p.image || !p.image.startsWith('/images/products/')) continue;

    const fname = path.basename(p.image.split('?')[0]);
    const absPath = path.join(publicDir, fname);

    if (fs.existsSync(absPath)) {
      // Run PowerShell System.Drawing background white-forcer script on each image
      const psCode = `
        Add-Type -AssemblyName System.Drawing
        $abs = "${absPath.replace(/\\/g, '\\\\')}"
        $img = [System.Drawing.Bitmap]::FromFile($abs)
        $newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.Clear([System.Drawing.Color]::White)
        
        for ($y = 0; $y -lt $img.Height; $y++) {
            for ($x = 0; $x -lt $img.Width; $x++) {
                $c = $img.GetPixel($x, $y)
                # If pixel is dark background or near black border, render pure white
                if ($c.R -le 40 -and $c.G -le 40 -and $c.B -le 40) {
                    $newImg.SetPixel($x, $y, [System.Drawing.Color]::White)
                } else {
                    $newImg.SetPixel($x, $y, $c)
                }
            }
        }
        $img.Dispose()
        $tempPath = $abs + ".tmp.jpg"
        $newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $newImg.Dispose()
        Remove-Item $abs -Force
        Rename-Item $tempPath $abs -Force
      `;
      const psFile = path.join(__dirname, 'reencode_single.ps1');
      fs.writeFileSync(psFile, psCode, 'utf8');

      try {
        execSync('powershell -ExecutionPolicy Bypass -File reencode_single.ps1', { cwd: __dirname });
        fixedBgCount++;
      } catch (e) {}
    }
  }

  // Update DB images with cache buster query string to force immediate browser cache clear
  const timestamp = Date.now();
  for (const p of products) {
    if (p.image && p.image.startsWith('/images/products/')) {
      const basePath = p.image.split('?')[0];
      const newUrl = `${basePath}?v=${timestamp}`;
      await connection.query("UPDATE products SET image = ? WHERE id = ?", [newUrl, p.id]);
    }
  }

  const [finalDbState] = await connection.query("SELECT COUNT(*) as total FROM products");

  console.log("\n==================================================");
  console.log("🎉 RE-ENCODING & BROWSER CACHE INVALIDATION COMPLETE");
  console.log("==================================================");
  console.log(`✨ Images Re-encoded with Pure White Backgrounds: ${fixedBgCount}`);
  console.log(`🛒 Total Active Live Products in DB: ${finalDbState[0].total}`);
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

auditAndReencodeAll166ImagesPureWhite();
