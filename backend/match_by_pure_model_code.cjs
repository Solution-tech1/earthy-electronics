const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const pypdf = require('child_process');

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['HRF', 'HR', 'HRB', 'HWM', 'HD', 'HWS', 'HDF', 'HSU', 'HPU', 'HDR', 'EBS', 'EBD', 'EPR', 'EP', 'ID', 'GD', 'FD', 'SD', 'DC', 'INOX', 'REF', 'KG', 'BTU', 'T3', 'T1', 'INV', 'INVERTER', 'QLED', 'OLED', 'TV', 'LED', '4K', 'UHD', 'FHD', 'GB', 'RAM', 'ROM', 'PK'];

  return str
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')
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

// Extract CORE model code without extra color/noise
function getCoreModelCode(modelStr) {
  if (!modelStr) return '';
  let clean = modelStr.toUpperCase().trim();
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\(IOT\)/gi, '')
               .replace(/\(WI-FI & SELF CLEANING\)/gi, '')
               .replace(/\(WITH KIT AND INSTALLATION\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .replace(/\bBLACK\b/gi, '')
               .replace(/\bSILVER\b/gi, '')
               .trim();

  return clean;
}

async function matchByPureModelCode() {
  console.log("==================================================");
  console.log("🚀 EXECUTING PURE MODEL NAME / MODEL CODE MATCHING");
  console.log("📄 File: HAIER JUNE-26 MRP.pdf");
  console.log("🗄️ Database: earthy_elec");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  // Parse all 8 pages of HAIER JUNE-26 MRP.pdf
  const pyCode = `import pypdf, json, os, re

fpath = r"e:\\earthyelectronics\\backend\\all products files\\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

all_items = []

# Page 1: Refrigerators
p1_text = reader.pages[0].extract_text() or ""
for line in p1_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Refrigerators",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Page 2 & 5: Air Conditioners
for p_idx in [1, 4]:
    p_text = reader.pages[p_idx].extract_text() or ""
    for line in p_text.split('\\n'):
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Capacity' in line:
            continue
        parts = line.split()
        if len(parts) >= 4:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    all_items.append({
                        "category": "Air Conditioners",
                        "model": model,
                        "mrp": int(mrp_str)
                    })

# Page 3: Washing Machines
p3_text = reader.pages[2].extract_text() or ""
for line in p3_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Washing Machines",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Page 4: Deep Freezers
p4_text = reader.pages[3].extract_text() or ""
for line in p4_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Deep Freezers",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Pages 6 & 7: LED TVs
for p_idx in [5, 6]:
    p_text = reader.pages[p_idx].extract_text() or ""
    for line in p_text.split('\\n'):
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line or 'Date:' in line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    all_items.append({
                        "category": "LED TVs",
                        "model": model,
                        "mrp": int(mrp_str)
                    })

# Page 8: Water Dispensers
p8_text = reader.pages[7].extract_text() or ""
for line in p8_text.split('\\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Company' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Water Dispensers",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

with open(r"e:\\earthyelectronics\\backend\\haier_all_models.json", "w", encoding="utf-8") as f:
    json.dump(all_items, f, indent=2)
`;

  fs.writeFileSync(path.join(__dirname, 'parse_all_models.py'), pyCode, 'utf8');
  pypdf.execSync(`python "${path.join(__dirname, 'parse_all_models.py')}"`);

  const allModels = JSON.parse(fs.readFileSync(path.join(__dirname, 'haier_all_models.json'), 'utf8'));

  console.log(`Successfully extracted ${allModels.length} Haier products from PDF.\n`);

  const [dbProducts] = await db.query('SELECT id, name, category, image FROM products');
  const existingMap = new Map();
  dbProducts.forEach(p => {
    existingMap.set(p.name.toLowerCase(), p);
  });

  let processedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  const unmatchedRows = [];

  for (let idx = 0; idx < allModels.length; idx++) {
    const item = allModels[idx];
    const rawModel = item.model || '';
    if (!rawModel || rawModel.length < 2) continue;

    const coreCode = getCoreModelCode(rawModel);
    const title = toTitleCase(`Haier ${rawModel}`);
    const priceNum = item.mrp || 50000;
    const discountPrice = Math.round(priceNum * 0.95);

    const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const defaultImg = `/images/haier_appliance_studio.png`;

    processedCount++;

    const existing = existingMap.get(title.toLowerCase());

    if (existing) {
      // Update price and category in DB
      await db.execute(
        `UPDATE products SET category = ?, price = ?, discountPrice = ? WHERE id = ?`,
        [item.category, priceNum, discountPrice, existing.id]
      );
      updatedCount++;
      console.log(`🔄 UPDATED [#${processedCount}]: [${item.category}] ${title} -> Price: Rs. ${priceNum.toLocaleString()}`);
    } else {
      // Insert new Haier product with Model Code
      await db.execute(
        `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, item.category, 'Haier', priceNum, discountPrice, defaultImg, `Original genuine Haier ${title} (Model: ${coreCode}). Official warranty.`, 10]
      );
      insertedCount++;
      console.log(`✨ INSERTED [#${processedCount}]: [${item.category}] ${title} -> Price: Rs. ${priceNum.toLocaleString()}`);
    }

    unmatchedRows.push(`"${processedCount}","Haier","${item.category}","${rawModel.replace(/"/g, '""')}","${priceNum}","","NOT_FOUND","Pure model code extracted: ${coreCode}"`);
  }

  // Write Haier_June26_Unmatched.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 PURE MODEL NAME MATCHING & INSERTION COMPLETE!");
  console.log("==================================================");
  console.log(`📦 Total Models Processed: ${processedCount}`);
  console.log(`✨ New Products Inserted: ${insertedCount}`);
  console.log(`🔄 Existing Products Updated: ${updatedCount}`);
  console.log(`📁 Logged to Unmatched CSV: Haier_June26_Unmatched.csv`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

matchByPureModelCode().catch(console.error);
