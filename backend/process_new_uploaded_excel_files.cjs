const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeCategory(cat, name = '') {
  cat = (cat || '').toLowerCase().trim();
  name = (name || '').toLowerCase().trim();

  if (cat.includes('led') || cat.includes('tv') || name.includes('tv') || name.includes('led') || name.includes('qled') || name.includes('oled')) return 'LED TVs';
  if (cat.includes('w-d') || cat.includes('dispen') || name.includes('dispenser') || name.includes('water dispenser')) return 'Water Dispensers';
  if (cat.includes('wm') || cat.includes('wash') || name.includes('washer') || name.includes('washing') || name.includes('spinner') || name.includes('dryer')) return 'Washing Machines';
  if (cat.includes('ref') || cat.includes('fridge') || name.includes('refriger')) return 'Refrigerators';
  if (cat.includes('ac') || name.includes('ac') || name.includes('inverter') || name.includes('air conditioner')) return 'Air Conditioners';
  if (cat.includes('m-w') || cat.includes('micro') || name.includes('microwave') || name.includes('oven')) return 'Microwave Ovens';
  return 'Home Appliances';
}

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['AC', 'TV', 'LED', 'UHD', 'QLED', 'OLED', '4K', '8K', 'DC', 'T3', 'INOX', 'HWM', 'DWF', 'DWT', 'HTW', 'DS', 'DW', 'REH', 'MEH', 'SEH', 'PEL', 'TCL', 'LG', 'KW', 'HW', 'HWD', 'HGL', 'HMO', 'XIAOMI', 'ECOSTAR', 'SAMSUNG', 'HAIER', 'ORIENT'];

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

async function processNewExcelFiles() {
  console.log("==================================================");
  console.log("🚀 PROCESSING ALL NEW EXCEL FILES (LED, WATER DISPENSER, WASHING MACHINE)");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  const [existingRows] = await db.query('SELECT name, image FROM products');
  const usedNames = new Set(existingRows.map(r => r.name.toLowerCase()));
  const usedImages = new Set(existingRows.map(r => r.image));

  const pyScript = path.join(__dirname, 'dump_excel_json.py');
  const pyCode = `import zipfile, xml.etree.ElementTree as ET, json, os

def read_xlsx(fpath):
    rows = []
    if not os.path.exists(fpath): return rows
    with zipfile.ZipFile(fpath, 'r') as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for elem in ss_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                strings.append(elem.text or '')
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        sheet_data = sheet_tree.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
        for r_elem in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for c_elem in r_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t = c_elem.get('t')
                v_elem = c_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v_elem.text if v_elem is not None else ''
                if t == 's' and val != '':
                    idx = int(val)
                    val = strings[idx] if idx < len(strings) else val
                row_vals.append(val)
            if any(row_vals):
                rows.append(row_vals)
    return rows

base_dir = r"e:\\earthyelectronics\\backend\\all products files"
led_rows = read_xlsx(os.path.join(base_dir, "LED UPLOADING.xlsx"))
wd_rows = read_xlsx(os.path.join(base_dir, "water dispenser.xlsx"))
wm_rows = read_xlsx(os.path.join(base_dir, "Washing Machine.xlsx"))

out = {
    "led": led_rows,
    "wd": wd_rows,
    "wm": wm_rows
}
with open(r"e:\\earthyelectronics\\backend\\parsed_excel_data.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
`;

  fs.writeFileSync(pyScript, pyCode, 'utf8');
  execSync(`python "${pyScript}"`);

  const rawJson = fs.readFileSync(path.join(__dirname, 'parsed_excel_data.json'), 'utf8');
  const parsedData = JSON.parse(rawJson);

  let insertedCount = 0;
  let skippedCount = 0;

  const datasetList = [
    { key: 'led', category: 'LED TVs', defaultPrice: 75000 },
    { key: 'wd', category: 'Water Dispensers', defaultPrice: 45000 },
    { key: 'wm', category: 'Washing Machines', defaultPrice: 55000 }
  ];

  for (const ds of datasetList) {
    const rows = parsedData[ds.key] || [];
    if (rows.length <= 1) continue;

    console.log(`\n📦 Processing ${rows.length - 1} products from ${ds.category} dataset...`);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const brand = sanitizeText(row[0] || 'Generic');
      const sku = sanitizeText(row[1] || '');
      const rawName = sanitizeText(row[2] || row[3] || row[4] || sku);
      const name = toTitleCase(rawName);

      if (!name || name.length < 3 || usedNames.has(name.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const desc = sanitizeText(row[3] || row[4] || `Original genuine ${name}. Official warranty.`);
      const origPrice = parseFloat((row[5] || '0').toString().replace(/[^\d.]/g, '')) || ds.defaultPrice;
      const salePrice = parseFloat((row[6] || '0').toString().replace(/[^\d.]/g, '')) || Math.round(origPrice * 0.95);
      const warranty = sanitizeText(row[7] || '1 Year Warranty');
      const rawImgs = (row[8] || '').split('|').map(s => s.trim()).filter(Boolean);

      let finalImageUrl = '/images/placeholder.png';

      if (rawImgs.length > 0) {
        const slug = `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const localPath = path.join(targetImagesDir, `${slug}.png`);
        const relUrl = `/images/${slug}.png`;

        if (fs.existsSync(localPath)) {
          finalImageUrl = relUrl;
        } else {
          try {
            const tempRaw = path.join(targetImagesDir, `${slug}_raw.png`);
            const imgUrl = rawImgs[0];
            const client = imgUrl.startsWith('https') ? https : http;

            await new Promise((res) => {
              client.get(imgUrl, (resp) => {
                const f = fs.createWriteStream(tempRaw);
                resp.pipe(f);
                f.on('finish', () => { f.close(); res(); });
              }).on('error', () => res());
            });

            if (fs.existsSync(tempRaw)) {
              await sharp(tempRaw)
                .flatten({ background: { r: 255, g: 255, b: 255 } })
                .png({ quality: 95 })
                .toFile(localPath);

              fs.unlinkSync(tempRaw);
              finalImageUrl = relUrl;
            }
          } catch (err) {
            console.error(`Image download error for ${name}: ${err.message}`);
          }
        }
      }

      const category = normalizeCategory(ds.category, name);
      const cleanDesc = sanitizeText(`${desc}\n\nWarranty: ${warranty}`);

      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, brand, origPrice, salePrice, finalImageUrl, cleanDesc, 10]
      );

      usedNames.add(name.toLowerCase());
      insertedCount++;
      console.log(`✅ INSERTED [#${insertedCount}]: [${brand}] ${name} -> Category: ${category} | Image: ${finalImageUrl}`);
    }
  }

  // Re-export products by category CSV files
  const exportScript = path.join(__dirname, 'export_products_by_category.cjs');
  if (fs.existsSync(exportScript)) {
    execSync(`node "${exportScript}"`);
  }

  console.log("\n==================================================");
  console.log("📊 NEW FILES IMPORT SUMMARY");
  console.log("==================================================");
  console.log(`✅ TOTAL NEW PRODUCTS INSERTED: ${insertedCount}`);
  console.log(`⚠️ TOTAL SKIPPED DUPLICATES: ${skippedCount}`);
  console.log("==================================================\n");

  process.exit(0);
}

processNewExcelFiles().catch(console.error);
