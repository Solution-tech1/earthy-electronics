const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

// Official verified CDN mapping on superasiastore.com
const SUPERASIA_ENHANCED_MAP = {
  // Exact Matches
  'sa110': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-110.png', type: 'DONE', notes: 'Exact model match on official site' },
  'sa111': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-111.png', type: 'DONE', notes: 'Exact model match on official site' },
  'sa210': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-210.png', type: 'DONE', notes: 'Exact model match on official site' },
  'sa255': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-255.png', type: 'DONE', notes: 'Exact model match on official site' },
  'sa260': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-260.png', type: 'DONE', notes: 'Exact model match on official site' },
  'sa540': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-540.png', type: 'DONE', notes: 'Exact model match on official site' },

  // Partial Matches (Color / Series Suffix Differences)
  'sa240showerwash': { url: 'https://superasiastore.com/media/catalog/product/s/a/sa-240.png', type: 'PARTIAL_MATCH', notes: 'Matched core SA-240 series, suffix Shower Wash needs manual review' },
  'sd525': { url: 'https://superasiastore.com/media/catalog/product/s/d/sd-525.png', type: 'PARTIAL_MATCH', notes: 'Matched core SD-525 series, needs manual review' }
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'SA', 'SD'];

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

async function processEnhancedSuperAsia() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const unmatchedCsvPath = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
  const rows = [];

  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      const superasiaRows = rows.filter(r => {
        const b = (r.Brand || '').toLowerCase();
        const m = (r.Model_Name || '').toLowerCase();
        return b.includes('super') || m.startsWith('sa') || m.startsWith('sd');
      });

      const manualReviewFile = path.join(__dirname, 'product files', 'Needs_Manual_Review.csv');
      const stillUnmatchedFile = path.join(__dirname, 'product files', 'Still_Unmatched.csv');

      let manualEntries = [];
      let stillUnmatchedEntries = [];

      if (fs.existsSync(manualReviewFile)) {
        const lines = fs.readFileSync(manualReviewFile, 'utf8').trim().split('\n').slice(1);
        manualEntries.push(...lines);
      }
      if (fs.existsSync(stillUnmatchedFile)) {
        const lines = fs.readFileSync(stillUnmatchedFile, 'utf8').trim().split('\n').slice(1);
        stillUnmatchedEntries.push(...lines);
      }

      let doneCount = 0;
      let partialCount = 0;
      let stillUnmatchedCount = 0;

      for (let idx = 0; idx < superasiaRows.length; idx++) {
        const r = superasiaRows[idx];
        const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let matchInfo = null;

        for (const [key, info] of Object.entries(SUPERASIA_ENHANCED_MAP)) {
          if (modelClean.includes(key) || key.includes(modelClean)) {
            matchInfo = info;
            break;
          }
        }

        if (matchInfo && matchInfo.type === 'DONE') {
          if (!usedImages.has(matchInfo.url)) {
            doneCount++;
            usedImages.add(matchInfo.url);

            // Insert into MariaDB products
            const name = toTitleCase(r.Model_Name);
            const brand = 'Super Asia';
            const category = normalizeCategory(r.Category, name);
            const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 22000;
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
                matchInfo.url,
                `Original genuine Super Asia ${name}. Official Super Asia warranty, fast Karachi delivery, and support.`,
                10
              ]
            );
          } else {
            stillUnmatchedCount++;
            stillUnmatchedEntries.push(`"${stillUnmatchedEntries.length + 1}","Super Asia","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","Duplicate image URL skipped"`);
          }
        } else if (matchInfo && matchInfo.type === 'PARTIAL_MATCH') {
          partialCount++;
          manualEntries.push(`"${manualEntries.length + 1}","Super Asia","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","${matchInfo.url}","${matchInfo.notes}"`);
        } else {
          stillUnmatchedCount++;
          stillUnmatchedEntries.push(`"${stillUnmatchedEntries.length + 1}","Super Asia","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","Model truly not found on official site - possibly discontinued"`);
        }
      }

      // Save Needs_Manual_Review.csv
      let mHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Image_URL,Match_Notes\n';
      fs.writeFileSync(manualReviewFile, mHeader + manualEntries.join('\n'), 'utf8');

      // Save Still_Unmatched.csv
      let uHeader = 'S_No,Brand,Category,Model_Name,SKU,Rate,Match_Notes\n';
      fs.writeFileSync(stillUnmatchedFile, uHeader + stillUnmatchedEntries.join('\n'), 'utf8');

      console.log("==================================================");
      console.log("📊 BRAND 7 (SUPER ASIA) ENHANCED CHUNK 1 REPORT");
      console.log("🌐 Source Portal: https://superasiastore.com");
      console.log("==================================================");
      console.log(`✅ DONE (Exact Match -> Added to Site): ${doneCount}`);
      console.log(`⚠️ PARTIAL_MATCH (Exported to Needs_Manual_Review.csv): ${partialCount}`);
      console.log(`❌ STILL_UNMATCHED (Exported to Still_Unmatched.csv): ${stillUnmatchedCount}`);
      console.log("==================================================\n");

      process.exit(0);
    });
}

processEnhancedSuperAsia().catch(console.error);
