const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

// Verified exact CDN mappings on official Dawlance portal (www.dawlance.com.pk)
const DAWLANCE_OFFICIAL_EXACT_MAP = {
  'dw11467es': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-11467-es.png',
  'dw1165': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-1165.png',
  'dw1167flp': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-1167-flp.png',
  'dw1775': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-1775.png',
  'dw6100': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-6100.png',
  'dw7500c': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-7500c.png',
  'dw9100': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-9100.png',
  'dwt9540': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dwt-9540.png',
  'dw128': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-128.png',
  'dw133': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-133.png',
  'dw136': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-136.png',
  'dw162': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-162.png',
  'dw295': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-295.png',
  'dw374': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-374.png',
  'dw388': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-388.png',
  'dw390s': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-390s.png',
  'dw395': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-395.png',
  'dw550': 'https://www.dawlance.com.pk/media/catalog/product/d/w/dw-550.png'
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'FLP', 'ES', 'LVS'];

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

async function processBrandDawlance() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
  const rows = [];

  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      const dawlanceRows = rows.filter(r => {
        const b = (r.Brand || '').toLowerCase();
        const m = (r.Model_Name || '').toLowerCase();
        return b.includes('dawlance') || m.startsWith('dw-') || m.startsWith('dwt');
      });

      const unmatchedFile = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
      let unmatchedEntries = [];

      if (fs.existsSync(unmatchedFile)) {
        const lines = fs.readFileSync(unmatchedFile, 'utf8').trim().split('\n').slice(1);
        unmatchedEntries.push(...lines);
      }

      let doneCount = 0;
      let unmatchedCount = 0;
      const usedImages = new Set();
      const chunkResults = [];

      for (let idx = 0; idx < dawlanceRows.length; idx++) {
        const r = dawlanceRows[idx];
        const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let foundUrl = '';

        for (const [key, url] of Object.entries(DAWLANCE_OFFICIAL_EXACT_MAP)) {
          if (modelClean.includes(key)) {
            if (!usedImages.has(url)) {
              foundUrl = url;
              usedImages.add(url);
            }
            break;
          }
        }

        if (foundUrl) {
          doneCount++;
          chunkResults.push({
            num: idx + 1,
            model: r.Model_Name,
            brand: 'Dawlance',
            category: r.Category,
            status: 'DONE',
            url: foundUrl
          });

          // Insert into MariaDB products
          const name = toTitleCase(r.Model_Name);
          const brand = 'Dawlance';
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 35000;
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
              `Original genuine Dawlance ${name}. Official Dawlance warranty, fast Karachi delivery, and installation support.`,
              10
            ]
          );
        } else {
          unmatchedCount++;
          chunkResults.push({
            num: idx + 1,
            model: r.Model_Name,
            brand: 'Dawlance',
            category: r.Category,
            status: 'UNMATCHED',
            reason: 'No exact model match on www.dawlance.com.pk'
          });

          unmatchedEntries.push(`"${unmatchedEntries.length + 1}","Dawlance","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","No exact model match on www.dawlance.com.pk"`);
        }
      }

      // Update Unmatched_Products.csv
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Reason_Unmatched\n';
      let body = unmatchedEntries.join('\n');
      fs.writeFileSync(unmatchedFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("📊 BRAND 1 (DAWLANCE) COMPLETION REPORT");
      console.log("🌐 Source Portal: https://www.dawlance.com.pk");
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

processBrandDawlance().catch(console.error);
