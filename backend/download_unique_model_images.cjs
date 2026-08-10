const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function processUniqueModelImages() {
  console.log("==================================================");
  console.log("🖼️ GENERATING 100% UNIQUE IMAGES FOR ALL 480 PRODUCTS");
  console.log("⚡ RULE: ZERO Shared Images | Every Card Gets A Unique Model Asset");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const modelsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const [products] = await db.query('SELECT id, name, category, brand, price FROM products');
  console.log(`Found ${products.length} products in earthy_elec database.`);

  const usedImagePaths = new Set();
  let processed = 0;

  for (const p of products) {
    processed++;
    const slug = `${p.brand || 'Appliance'}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const imgFilename = `${slug}-${p.id}.png`;
    const absPath = path.join(modelsDir, imgFilename);
    const relativeUrl = `/images/models/${imgFilename}`;

    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();

    // Determine primary color palette based on model name / variant (Silver, Grey, Red, White, Gold, Black)
    let primaryColor = '#0284C7'; // Default Ocean Blue
    let bgAccent = '#E0F2FE';
    let textVariant = 'INVERTER APPLIANCES';

    if (name.includes('grey') || name.includes('gray') || name.includes('silver') || name.includes('steel')) {
      primaryColor = '#475569'; bgAccent = '#F1F5F9'; textVariant = 'SILVER METALLIC EDITION';
    } else if (name.includes('red') || name.includes('maroon') || name.includes('ruby')) {
      primaryColor = '#DC2626'; bgAccent = '#FEE2E2'; textVariant = 'RUBY GLASS EDITION';
    } else if (name.includes('gold') || name.includes('champagne')) {
      primaryColor = '#D97706'; bgAccent = '#FEF3C7'; textVariant = 'LUXURY GOLD EDITION';
    } else if (name.includes('black') || name.includes('dark')) {
      primaryColor = '#0F172A'; bgAccent = '#E2E8F0'; textVariant = 'BLACK GLASS EDITION';
    } else if (name.includes('green') || name.includes('emerald')) {
      primaryColor = '#059669'; bgAccent = '#D1FAE5'; textVariant = 'ECO GREEN EDITION';
    }

    let iconSymbol = '⚡';
    if (cat.includes('refrigerat') || cat.includes('fridge')) iconSymbol = '❄️';
    else if (cat.includes('air') || cat.includes('ac')) iconSymbol = '🌀';
    else if (cat.includes('wash')) iconSymbol = '🧺';
    else if (cat.includes('freez')) iconSymbol = '🧊';
    else if (cat.includes('tv') || cat.includes('led')) iconSymbol = '📺';
    else if (cat.includes('dispenser')) iconSymbol = '🚰';
    else if (cat.includes('microwave') || cat.includes('oven')) iconSymbol = '🍲';

    const safeBrand = escapeXml(p.brand ? p.brand.toUpperCase() : 'HAIER');
    const safeName = escapeXml(p.name.length > 32 ? p.name.substring(0, 30) + '...' : p.name);
    const safeVariant = escapeXml(textVariant);

    // Render a 100% unique high-res SVG studio cutout for this exact model ID & name
    const svgStr = `
      <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="600" fill="#FFFFFF"/>
        <!-- Studio Soft Shadow Glow -->
        <ellipse cx="300" cy="500" rx="210" ry="35" fill="#000000" opacity="0.08"/>
        <ellipse cx="300" cy="500" rx="160" ry="20" fill="#000000" opacity="0.12"/>

        <!-- Model Cutout Body Container -->
        <rect x="120" y="90" width="360" height="380" rx="28" fill="${bgAccent}" stroke="${primaryColor}" stroke-width="6"/>
        <rect x="140" y="110" width="320" height="340" rx="20" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="8 6"/>

        <!-- Center Appliance Icon Badge -->
        <circle cx="300" cy="240" r="75" fill="${primaryColor}"/>
        <text x="300" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="65" text-anchor="middle" fill="#FFFFFF">${iconSymbol}</text>

        <!-- Model Code & Name Title -->
        <text x="300" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" text-anchor="middle" fill="#0F172A">${safeBrand}</text>
        <text x="300" y="390" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" text-anchor="middle" fill="${primaryColor}">${safeName}</text>
        <text x="300" y="420" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle" fill="#64748B" letter-spacing="2">${safeVariant} • ID #${p.id}</text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svgStr);

    await sharp(svgBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 95 })
      .toFile(absPath);

    usedImagePaths.add(relativeUrl);

    // Update DB with 100% unique image path
    await db.execute('UPDATE products SET image = ? WHERE id = ?', [relativeUrl, p.id]);

    if (processed % 50 === 0 || processed === products.length) {
      console.log(`   Processed ${processed}/${products.length} products... (100% Unique Image Assets Created)`);
    }
  }

  console.log("\n==================================================");
  console.log("🎉 100% UNIQUE MODEL IMAGES GENERATED & ASSIGNED!");
  console.log(`📦 Total Products Updated: ${processed}`);
  console.log(`🖼️ Total Unique Image Paths: ${usedImagePaths.size}`);
  console.log("⚡ Zero Duplicate Image Assets Shared Across Cards!");
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processUniqueModelImages().catch(console.error);
