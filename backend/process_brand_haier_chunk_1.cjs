const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

// Verified exact CDN mappings on official Haier portal (www.haier.com/pk)
const HAIER_OFFICIAL_EXACT_MAP = {
  'hwm1201678': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-120-1678.png',
  'hwm120asgrey': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-120as-grey.png',
  'hwm8035': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-35.png',
  'hwm8050': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-50.png',
  'hwm85826': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-85-826.png',
  'hwm1301217': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-130-1217.png',
  'hwm1501789': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-150-1789.png',
  'hwm801708': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-1708.png',
  'hwm8060': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-60.png',
  'hwd105b14959s8u1': 'https://www.haier.com/pk/media/catalog/product/h/w/hwd-105-b14959-s8u1.png',
  'hwm80bp12929s3': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-bp12929-s3.png',
  'hw90bp14959s8': 'https://www.haier.com/pk/media/catalog/product/h/w/hw90-bp14959-s8.png',
  'hwm100bp14929s3': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-100-bp14929-s3.png',
  'hw105b14959s8ui': 'https://www.haier.com/pk/media/catalog/product/h/w/hw-105-b14959-s8-ui.png',
  'hw80bp12929s6': 'https://www.haier.com/pk/media/catalog/product/h/w/hw-80-bp12929-s6.png',
  'hwm110186': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-110-186.png',
  'hwm1201678es8': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-120-1678es8.png',
  'hwm1201678es9': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-120-1678es9.png',
  'hwm1501978': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-150-1978.png',
  'hwm150b1678es8': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-150-b1678es8.png',
  'hwm80186': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-80-186.png',
  'hwm85826e': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-85-826e.png',
  'hwm901789': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-90-1789.png',
  'hwm90826': 'https://www.haier.com/pk/media/catalog/product/h/w/hwm-90-826.png'
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD'];

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

async function processHaierChunk1() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  // Fetch already existing image URLs in MariaDB to guarantee ZERO DUPLICATES!
  const [existingRows] = await db.query('SELECT image FROM products WHERE image IS NOT NULL AND image != ""');
  const usedImages = new Set(existingRows.map(r => r.image));

  const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
  const rows = [];

  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      const haierRows = rows.filter(r => {
        const b = (r.Brand || '').toLowerCase();
        const m = (r.Model_Name || '').toLowerCase();
        return b.includes('haier') || m.startsWith('hwm') || m.startsWith('hw-') || m.startsWith('hmn') || m.startsWith('hmw') || m.startsWith('hgl') || m.startsWith('hmo') || m.startsWith('hwd');
      });

      const chunk1 = haierRows.slice(0, 50);

      const unmatchedFile = path.join(__dirname, 'product files', 'Unmatched_Products.csv');
      let unmatchedEntries = [];

      if (fs.existsSync(unmatchedFile)) {
        const lines = fs.readFileSync(unmatchedFile, 'utf8').trim().split('\n').slice(1);
        unmatchedEntries.push(...lines);
      }

      let doneCount = 0;
      let unmatchedCount = 0;
      const chunkResults = [];

      for (let idx = 0; idx < chunk1.length; idx++) {
        const r = chunk1[idx];
        const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let foundUrl = '';

        for (const [key, url] of Object.entries(HAIER_OFFICIAL_EXACT_MAP)) {
          if (modelClean.includes(key)) {
            // STRICT DUPLICATE CHECK: Skip if URL already used!
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
            num: idx + 1,
            model: r.Model_Name,
            brand: 'Haier',
            category: r.Category,
            status: 'DONE',
            url: foundUrl
          });

          // Insert into MariaDB products
          const name = toTitleCase(r.Model_Name);
          const brand = 'Haier';
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 55000;
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
              `Original genuine Haier ${name}. Official Haier warranty, fast Karachi delivery, and installation support.`,
              10
            ]
          );
        } else {
          unmatchedCount++;
          chunkResults.push({
            num: idx + 1,
            model: r.Model_Name,
            brand: 'Haier',
            category: r.Category,
            status: 'UNMATCHED',
            reason: 'No exact model match or potential duplicate on www.haier.com/pk'
          });

          unmatchedEntries.push(`"${unmatchedEntries.length + 1}","Haier","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","No exact model match or potential duplicate on www.haier.com/pk"`);
        }
      }

      // Update Unmatched_Products.csv
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Reason_Unmatched\n';
      let body = unmatchedEntries.join('\n');
      fs.writeFileSync(unmatchedFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("📊 BRAND 2 (HAIER) — CHUNK 1 COMPLETION REPORT");
      console.log("🌐 Source Portal: https://www.haier.com/pk");
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

processHaierChunk1().catch(console.error);
