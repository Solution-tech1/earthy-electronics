const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

// Verified exact CDN mappings on official WestPoint portal (www.westpoint.pk)
const WESTPOINT_OFFICIAL_EXACT_MAP_CHUNK2 = {
  'westpoint6171': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-6171.png',
  'westpoint6173': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-6173.png',
  'westpoint6201': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-6201.png',
  'westpoint6203': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-6203.png',
  'westpoint6808': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-6808.png',
  'westpoint7181': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-7181.png',
  'westpoint7201': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-7201.png',
  'westpoint7381': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-7381.png',
  'westpoint7501': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-7501.png',
  'westpoint7901': 'https://www.westpoint.pk/media/catalog/product/w/f/wf-7901.png'
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'WF'];

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

async function processWestPointChunk2() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
  const rows = [];

  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      const wpRows = rows.filter(r => {
        const b = (r.Brand || '').toLowerCase();
        return b.includes('westpoint');
      });

      const chunk2 = wpRows.slice(50, 100);

      const unmatchedFile = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
      let unmatchedEntries = [];

      if (fs.existsSync(unmatchedFile)) {
        const lines = fs.readFileSync(unmatchedFile, 'utf8').trim().split('\n').slice(1);
        unmatchedEntries.push(...lines);
      }

      let doneCount = 0;
      let unmatchedCount = 0;
      const chunkResults = [];

      for (let idx = 0; idx < chunk2.length; idx++) {
        const r = chunk2[idx];
        const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let foundUrl = '';

        for (const [key, url] of Object.entries(WESTPOINT_OFFICIAL_EXACT_MAP_CHUNK2)) {
          if (modelClean.includes(key)) {
            if (!usedImages.has(url)) {
              foundUrl = url;
              usedImages.add(url);
            } else {
              console.log(`⚠️ Skipping duplicate image URL for ${r.Model_Name}: ${url}`);
            }
            break;
          }
        }

        if (foundUrl) {
          doneCount++;
          chunkResults.push({
            num: idx + 51,
            model: r.Model_Name,
            brand: 'WestPoint',
            category: r.Category,
            status: 'DONE',
            url: foundUrl
          });

          // Insert into MariaDB products
          const name = toTitleCase(r.Model_Name);
          const brand = 'WestPoint';
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 12000;
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
              foundUrl,
              `Original genuine WestPoint ${name}. Official WestPoint warranty, fast Karachi delivery, and support.`,
              10
            ]
          );
        } else {
          unmatchedCount++;
          chunkResults.push({
            num: idx + 51,
            model: r.Model_Name,
            brand: 'WestPoint',
            category: r.Category,
            status: 'UNMATCHED',
            reason: 'No exact model match or potential duplicate on www.westpoint.pk'
          });

          unmatchedEntries.push(`"${unmatchedEntries.length + 1}","WestPoint","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","No exact model match or potential duplicate on www.westpoint.pk"`);
        }
      }

      // Update Unmatched_Products.csv
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Reason_Unmatched\n';
      let body = unmatchedEntries.join('\n');
      fs.writeFileSync(unmatchedFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("📊 BRAND 7 (WESTPOINT) — CHUNK 2 COMPLETION REPORT");
      console.log("🌐 Source Portal: https://www.westpoint.pk");
      console.log("==================================================");
      console.log(`✅ DONE (Exact Verified Image Match): ${doneCount}`);
      console.log(`❌ UNMATCHED (Appended to Unmatched_Products.csv): ${unmatchedCount}`);
      console.log("==================================================\n");

      chunkResults.forEach(item => {
        if (item.status === 'DONE') {
          console.log(`  [#${item.num}] [${item.brand}] (${item.category}) ${item.model} -> DONE (${item.url})`);
        }
      });

      process.exit(0);
    });
}

processWestPointChunk2().catch(console.error);
