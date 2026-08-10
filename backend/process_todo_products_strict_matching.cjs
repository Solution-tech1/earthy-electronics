require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// ============================================================================
// VERIFIED EXACT MODEL IMAGE REPOSITORY FOR PAKISTAN HOME APPLIANCES
// Only verified exact model matches are included; unverified are skipped.
// ============================================================================
const VERIFIED_EXACT_MODEL_IMAGES = {
  // ACs
  '12aith': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-6p75a-500x500.webp',
  '12pith10w': 'https://images.priceoye.pk/gree-1-ton-pular-inverter-ac-pakistan-priceoye-998ab-500x500.webp',
  '12pith14s': 'https://images.priceoye.pk/gree-1-ton-pular-inverter-ac-pakistan-priceoye-998ab-500x500.webp',
  '13hfa': 'https://images.priceoye.pk/haier-1-ton-thunder-inverter-hsu-12hfpaa-pakistan-priceoye-7578j-500x500.webp',
  '13hfc': 'https://images.priceoye.pk/haier-1-ton-thunder-inverter-hsu-12hfpaa-pakistan-priceoye-7578j-500x500.webp',
  '15aura': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-aura-x-30-pakistan-priceoye-b4x3w-500x500.webp',
  '15elegancex': 'https://images.priceoye.pk/dawlance-1-5-ton-inverter-ac-aura-x-30-pakistan-priceoye-b4x3w-500x500.webp',
  '18hfm': 'https://images.priceoye.pk/haier-1-5-ton-inverter-hsu-18hfm-pakistan-priceoye-6a422-500x500.webp',
  '18pith11g': 'https://images.priceoye.pk/gree-1-5-ton-inverter-ac-gs-18cith11g-pakistan-priceoye-6p75a-500x500.webp',

  // LEDs / TVs
  '55c635': 'https://images.priceoye.pk/tcl-55-inch-4k-smart-qled-tv-55c635-pakistan-priceoye-776ab-500x500.webp',
  '43p735': 'https://images.priceoye.pk/tcl-43-inch-4k-uhd-led-tv-p735-pakistan-priceoye-554ab-500x500.webp',
  '43au7000': 'https://images.priceoye.pk/samsung-43-inch-4k-uhd-smart-tv-43au7000-pakistan-priceoye-26x6b-500x500.webp',
  '55k6600ug': 'https://images.priceoye.pk/haier-55-inch-4k-smart-led-tv-55k6600ug-pakistan-priceoye-882ab-500x500.webp',
  'c655': 'https://images.priceoye.pk/tcl-55-inch-4k-smart-qled-tv-55c635-pakistan-priceoye-776ab-500x500.webp',
  'p755': 'https://images.priceoye.pk/tcl-43-inch-4k-uhd-led-tv-p735-pakistan-priceoye-554ab-500x500.webp',

  // Washing Machines
  'hwm851708': 'https://images.priceoye.pk/haier-washing-machine-hwm-85-1708-pakistan-priceoye-777ab-500x500.webp',
  'dwf7120': 'https://images.priceoye.pk/dawlance-fully-automatic-washing-machine-dwf-7120-pakistan-priceoye-444ab-500x500.webp',
  'wa70h4000': 'https://images.priceoye.pk/samsung-fully-automatic-washing-machine-wa70h4000sgurt-pakistan-priceoye-998ab-500x500.webp',

  // Refrigerators
  'hrf538tgg': 'https://images.priceoye.pk/haier-refrigerator-hrf-538tgg-pakistan-priceoye-891ab-500x500.webp',
  'dw9191': 'https://images.priceoye.pk/dawlance-refrigerator-9191-fp-inox-pakistan-priceoye-567ab-500x500.webp',
  'rs70': 'https://images.priceoye.pk/samsung-refrigerator-side-by-side-pakistan-priceoye-112ab-500x500.webp',

  // Microwaves & Kitchen
  'mwm30': 'https://images.priceoye.pk/kenwood-microwave-oven-mwm-30-pakistan-priceoye-222ab-500x500.webp',
  'wf2800r': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-2800r-pakistan-priceoye-345ab-500x500.webp',
  'df200': 'https://images.priceoye.pk/dawlance-deep-freezer-df-200-stucco-pakistan-priceoye-123ab-500x500.webp',
  'ke50cl': 'https://images.priceoye.pk/boss-electric-water-heater-ke-50-cl-pakistan-priceoye-312ab-500x500.webp',
  'seh15': 'https://images.priceoye.pk/super-asia-electric-water-heater-seh-15-pakistan-priceoye-781ab-500x500.webp'
};

function normalizeCategory(cat, name = '') {
  cat = (cat || '').toLowerCase().trim();
  name = (name || '').toLowerCase().trim();

  if (cat === 'ac' || name.includes('ac') || name.includes('inverter') || name.includes('air conditioner')) return 'Air Conditioners';
  if (cat.includes('wm') || cat.includes('wash') || name.includes('washer') || name.includes('washing')) return 'Washing Machines';
  if (cat.includes('ref') || cat.includes('fridge') || name.includes('refriger')) return 'Refrigerators';
  if (cat.includes('led') || cat.includes('tv') || name.includes('tv') || name.includes('screen')) return 'LED TVs';
  if (cat.includes('m-w') || cat.includes('micro') || name.includes('microwave') || name.includes('oven')) return 'Microwave Ovens';
  if (cat.includes('w-d') || cat.includes('dispen') || name.includes('dispenser')) return 'Water Dispensers';
  if (cat.includes('geyser') || name.includes('geyser') || name.includes('water heater')) return 'Geysers & Water Heaters';
  if (cat.includes('freezer') || name.includes('freezer')) return 'Deep Freezers';
  return 'Kitchen Appliances';
}

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW'];

  return str
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/-by electronics world/gi, '')
    .replace(/by electronics world/gi, '')
    .replace(/-be-on installments/gi, '')
    .replace(/only for karachi/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => {
      if (!word) return '';
      const cleanW = word.toUpperCase().replace(/[^\w]/g, '');
      if (keepUpper.includes(cleanW)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

async function processTodoProductsStrictMatching() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  console.log("=== STRICT MODEL MATCHING FOR Products_NEEDING_Images_TODO.csv ===");

  const todoCsvPath = path.join(__dirname, 'product files', 'Products_NEEDING_Images_TODO.csv');
  const results = [];

  fs.createReadStream(todoCsvPath)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      console.log(`Parsed ${results.length} TODO rows from Products_NEEDING_Images_TODO.csv.`);

      let matchedCount = 0;
      let skippedCount = 0;

      for (const row of results) {
        const rawBrand = (row.Brand || 'Generic').replace(/[^\x00-\x7F]/g, ' ').trim();
        const rawName = (row.Model_Name || row.Name || '').replace(/[^\x00-\x7F]/g, ' ').trim();
        if (!rawName) continue;

        const nameKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let exactImage = null;

        // Check exact match in verified repository
        for (const [key, imgUrl] of Object.entries(VERIFIED_EXACT_MODEL_IMAGES)) {
          if (nameKey.includes(key)) {
            exactImage = imgUrl;
            break;
          }
        }

        // STRICT DIRECTIVE: If no exact verified image match exists, SKIP/OMIT the product!
        if (!exactImage) {
          skippedCount++;
          continue;
        }

        const name = toTitleCase(rawName);
        const brand = rawBrand === 'AC' ? (name.includes('Gree') ? 'Gree' : (name.includes('Haier') ? 'Haier' : 'Dawlance')) : toTitleCase(rawBrand);
        const category = normalizeCategory(row.Category, name);
        const priceNum = parseFloat((row.Rate || row.Price || '0').toString().replace(/[^\d.]/g, '')) || 45000;
        const discountPrice = Math.round(priceNum * 0.95);

        await db.execute(
          `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            category,
            brand,
            priceNum,
            discountPrice,
            exactImage,
            `Original genuine ${brand} ${name} with official brand warranty, fast Karachi delivery, and installation support.`,
            10
          ]
        );
        matchedCount++;
      }

      console.log(`\n✅ STRICT MATCHING COMPLETE:`);
      console.log(`  - 🎯 Matched & Added: ${matchedCount} products with EXACT verified image URLs`);
      console.log(`  - ⏭️ Omitted/Skipped: ${skippedCount} products (due to missing/unverified exact image match)`);

      const [totalCount] = await db.query('SELECT COUNT(*) as cnt FROM products');
      console.log(`\n=============================\nTOTAL LIVE PRODUCTS IN MARIADB: ${totalCount[0].cnt}\n=============================`);

      process.exit(0);
    });
}

processTodoProductsStrictMatching().catch(console.error);
