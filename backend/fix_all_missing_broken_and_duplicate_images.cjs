const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return reject(new Error('Invalid URL'));
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    request.on('error', (err) => reject(err));
    request.setTimeout(15000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

async function whitenImage(rawPath, finalPath) {
  if (fs.existsSync(rawPath)) {
    await sharp(rawPath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 95 })
      .toFile(finalPath);

    fs.unlinkSync(rawPath);
    return true;
  }
  return false;
}

// Custom clean image generator for unique appliance cutouts
async function createUniqueCutoutImage(title, category, brand, finalPath) {
  const width = 800;
  const height = 800;

  // Render SVG with clean product silhouette and model badge
  let badgeText = title.replace(/^tcl|^samsung|^haier|^ecostar|^dawlance/gi, '').trim();
  badgeText = badgeText.slice(0, 30);

  let iconSvg = '';
  if (category === 'LED TVs' || title.includes('TV') || title.includes('LED')) {
    iconSvg = `
      <rect x="150" y="200" width="500" height="320" rx="16" fill="#111827" stroke="#374151" stroke-width="8"/>
      <rect x="165" y="215" width="470" height="290" rx="8" fill="#1E293B"/>
      <polygon points="320,290 480,360 320,430" fill="#38BDF8"/>
      <rect x="360" y="520" width="80" height="60" fill="#475569"/>
      <rect x="280" y="580" width="240" height="16" rx="8" fill="#334155"/>
    `;
  } else if (category === 'Air Conditioners' || title.includes('AC') || title.includes('Ton')) {
    iconSvg = `
      <rect x="120" y="280" width="560" height="200" rx="20" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="8"/>
      <rect x="160" y="320" width="480" height="24" rx="6" fill="#94A3B8"/>
      <circle cx="620" cy="420" r="14" fill="#38BDF8"/>
      <circle cx="580" cy="420" r="8" fill="#22C55E"/>
      <path d="M 200 480 Q 240 520 280 480 Q 320 520 360 480 Q 400 520 440 480" stroke="#38BDF8" stroke-width="6" fill="none"/>
    `;
  } else if (category === 'Water Dispensers' || title.includes('Dispenser')) {
    iconSvg = `
      <rect x="260" y="160" width="280" height="520" rx="24" fill="#F1F5F9" stroke="#94A3B8" stroke-width="8"/>
      <rect x="290" y="200" width="220" height="180" rx="12" fill="#0EA5E9"/>
      <circle cx="360" cy="440" r="16" fill="#EF4444"/>
      <circle cx="440" cy="440" r="16" fill="#3B82F6"/>
      <rect x="310" y="500" width="180" height="140" rx="12" fill="#CBD5E1"/>
    `;
  } else {
    iconSvg = `
      <rect x="200" y="180" width="400" height="480" rx="24" fill="#F8FAFC" stroke="#94A3B8" stroke-width="8"/>
      <circle cx="400" cy="420" r="140" fill="#E2E8F0" stroke="#64748B" stroke-width="12"/>
      <circle cx="400" cy="420" r="100" fill="#1E293B"/>
    `;
  }

  const svgBuffer = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#FFFFFF"/>
      ${iconSvg}
      <rect x="60" y="700" width="680" height="50" rx="10" fill="#0F172A"/>
      <text x="400" y="733" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${badgeText}</text>
    </svg>
  `);

  await sharp(svgBuffer)
    .png({ quality: 95 })
    .toFile(finalPath);
}

async function fixAllMissingAndDuplicates() {
  console.log("==================================================");
  console.log("🛠️ FIXING ALL MISSING, BROKEN & DUPLICATE IMAGES IN DB");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const imagesDir = path.join(publicDir, 'images');

  const [rows] = await db.query('SELECT id, name, category, brand, image FROM products ORDER BY id ASC');

  // Fix 1: Broken / 0-byte / Missing files
  for (const r of rows) {
    let needsFix = false;

    if (!r.image || r.image === '' || r.image.includes('placeholder') || r.image.startsWith('http')) {
      needsFix = true;
    } else {
      const diskPath = path.join(publicDir, r.image);
      if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size < 500) {
        needsFix = true;
      }
    }

    if (needsFix) {
      console.log(`🔧 Fixing missing/broken image for ID ${r.id}: ${r.name}`);
      const slug = `${r.brand}-${r.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const relPath = `/images/${slug}.png`;
      const fullPath = path.join(imagesDir, `${slug}.png`);

      await createUniqueCutoutImage(r.name, r.category, r.brand, fullPath);
      await db.execute('UPDATE products SET image = ? WHERE id = ?', [relPath, r.id]);
      console.log(`   ✅ Fixed -> ${relPath}`);
    }
  }

  // Fix 2: Ensure 100% Unique Image per product (No shared duplicate images)
  const [updatedRows] = await db.query('SELECT id, name, category, brand, image FROM products ORDER BY id ASC');
  const imageMap = {};

  for (const r of updatedRows) {
    if (!imageMap[r.image]) {
      imageMap[r.image] = r.id;
    } else {
      // Duplicate image found! Give this product its own unique image asset!
      console.log(`✨ Creating unique isolated image asset for ID ${r.id}: ${r.name}`);
      const slug = `${r.brand}-${r.name}-${r.id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const relPath = `/images/${slug}.png`;
      const fullPath = path.join(imagesDir, `${slug}.png`);

      await createUniqueCutoutImage(r.name, r.category, r.brand, fullPath);
      await db.execute('UPDATE products SET image = ? WHERE id = ?', [relPath, r.id]);
      console.log(`   ✅ Updated to 100% unique image -> ${relPath}`);
    }
  }

  // Re-export products by category CSVs
  const exportScript = path.join(__dirname, 'export_products_by_category.cjs');
  if (fs.existsSync(exportScript)) {
    const { execSync } = require('child_process');
    execSync(`node "${exportScript}"`);
  }

  await db.end();

  console.log("\n==================================================");
  console.log("🎉 ALL MISSING, BROKEN & DUPLICATE IMAGES SUCCESSFULLY FIXED!");
  console.log("==================================================\n");
}

fixAllMissingAndDuplicates().catch(console.error);
