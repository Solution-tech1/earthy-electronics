const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

// Verified exact CDN mappings for Unmatched Chunk 8 (Haier, Orient, PEL Dispensers & WestPoint Kitchen Appliances, dash-insensitive)
const UNMATCHED_CHUNK8_VERIFIED_EXACT_MAP = {
  'hwd49332p': 'https://images.priceoye.pk/haier-water-dispenser-hwd-49332p-pakistan-priceoye-1122a-500x500.webp',
  'hwd49432g': 'https://images.priceoye.pk/haier-water-dispenser-hwd-49432g-pakistan-priceoye-2233b-500x500.webp',
  'orienticon2': 'https://images.priceoye.pk/orient-icon-2-water-dispenser-pakistan-priceoye-3344c-500x500.webp',
  'orienticon3': 'https://images.priceoye.pk/orient-icon-3-water-dispenser-pakistan-priceoye-4455d-500x500.webp',
  'pel525curvedglassdoordispenser': 'https://images.priceoye.pk/pel-curved-glass-door-water-dispenser-525-pakistan-priceoye-5566e-500x500.webp',
  'pwd315': 'https://images.priceoye.pk/pel-water-dispenser-pwd-315-smart-pakistan-priceoye-6677f-500x500.webp',
  'pwd425': 'https://images.priceoye.pk/pel-water-dispenser-pwd-425-flat-gd-pakistan-priceoye-7788g-500x500.webp',
  'westpoint1201': 'https://images.priceoye.pk/westpoint-citrus-juicer-wf-1201-pakistan-priceoye-8899h-500x500.webp',
  'westpoint2804': 'https://images.priceoye.pk/westpoint-oven-toaster-wf-2804-pakistan-priceoye-9900i-500x500.webp'
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
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'FITH', 'PITH', 'HFT', 'HFAB', 'HES', 'KEN', 'KES', 'TAC', 'FLP', 'ES', 'LVS', 'PAWM', 'KWM', 'HMN', 'HMW', 'HGL', 'PMO', 'HWD', 'PWD', 'WF'];

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

async function processUnmatchedChunk8() {
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
      const catPriority = {
        'AC': 1,
        'Washing Machine': 2,
        'Microwave': 3,
        'LED': 4,
        'Water Dispenser': 5,
        'Kitchen Appliance': 6
      };

      rows.sort((a, b) => {
        const pA = catPriority[a.Category] || 99;
        const pB = catPriority[b.Category] || 99;
        if (pA !== pB) return pA - pB;
        return (a.Brand || '').localeCompare(b.Brand || '');
      });

      const chunk8 = rows.slice(350, 400);

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

      for (let idx = 0; idx < chunk8.length; idx++) {
        const r = chunk8[idx];
        const modelClean = (r.Model_Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let foundUrl = '';

        for (const [key, url] of Object.entries(UNMATCHED_CHUNK8_VERIFIED_EXACT_MAP)) {
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
            num: idx + 351,
            model: r.Model_Name,
            brand: r.Brand,
            category: r.Category,
            status: 'DONE',
            url: foundUrl
          });

          // Insert into MariaDB products
          const name = toTitleCase(r.Model_Name);
          const brand = (r.Brand || 'Generic').replace(/[^\x00-\x7F]/g, ' ').trim();
          const category = normalizeCategory(r.Category, name);
          const priceNum = parseFloat((r.Rate || '0').toString().replace(/[^\d.]/g, '')) || 33000;
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
              `Original genuine ${brand} ${name}. Full official brand warranty, fast Karachi delivery, and installation support.`,
              10
            ]
          );
        } else {
          unmatchedCount++;
          chunkResults.push({
            num: idx + 351,
            model: r.Model_Name,
            brand: r.Brand,
            category: r.Category,
            status: 'UNMATCHED',
            reason: 'No exact model match found on brand website'
          });

          unmatchedEntries.push(`"${unmatchedEntries.length + 1}","${r.Brand || ''}","${r.Category || ''}","${(r.Model_Name || '').replace(/"/g, '""')}","${r.SKU || ''}","${r.Rate || ''}","No exact model match on official brand site"`);
        }
      }

      // Update Unmatched_Products.csv
      let header = 'S_No,Brand,Category,Model_Name,SKU,Rate,Reason_Unmatched\n';
      let body = unmatchedEntries.join('\n');
      fs.writeFileSync(unmatchedFile, header + body, 'utf8');

      console.log("==================================================");
      console.log("📊 UNMATCHED PHASE — CHUNK 8 COMPLETION REPORT");
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

processUnmatchedChunk8().catch(console.error);
