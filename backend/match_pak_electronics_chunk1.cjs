const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

function toTitleCase(str) {
  if (!str) return '';
  const keepUpper = ['HRF', 'HR', 'HRB', 'EBS', 'EBD', 'EPR', 'EP', 'ID', 'GD', 'FD', 'SD', 'DC', 'INOX', 'REF', 'KG'];

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

function getCoreModelDetails(modelStr) {
  if (!modelStr) return { coreNum: '', raw: modelStr, variants: [] };
  
  let clean = modelStr.toUpperCase().trim();
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\(IOT\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .replace(/\bBLACK\b/gi, '')
               .replace(/\bSILVER\b/gi, '')
               .trim();

  const numMatch = clean.match(/\d+/);
  const coreNum = numMatch ? numMatch[0] : '';

  const variants = [];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    parts.forEach(p => {
      const v = p.replace(/[^\w]/g, '').trim();
      if (v) variants.push(v);
    });
  }

  return { coreNum, cleanModel: clean, variants };
}

async function matchPakElectronicsChunk1() {
  console.log("==================================================");
  console.log("🚀 MATCHING REFRIGERATORS CHUNK 1 (50 PRODUCTS) FROM PAK-ELECTRONICS.PK");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const targetImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');
  const catalogPath = path.join(__dirname, 'pak_electronics_catalog.json');

  if (!fs.existsSync(catalogPath)) {
    console.error("Error: pak_electronics_catalog.json not found yet!");
    process.exit(1);
  }

  const scrapedCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  console.log(`Loaded ${scrapedCatalog.length} products scraped from pak-electronics.pk`);

  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_refrigerators_parsed.json'), 'utf8');
  const allRefItems = JSON.parse(rawJson);
  const chunk1 = allRefItems.slice(0, 50);

  let foundCount = 0;
  let notFoundCount = 0;

  const unmatchedFile = path.join(__dirname, 'product files', 'Haier_June26_Unmatched.csv');
  const unmatchedRows = [];

  const [dbProducts] = await db.query('SELECT name FROM products');
  const usedNames = new Set(dbProducts.map(p => p.name.toLowerCase()));

  console.log("\n--------------------------------------------------");
  console.log("🔍 MATCHING REFRIGERATOR CHUNK 1 PRODUCTS:");
  console.log("--------------------------------------------------");

  for (let idx = 0; idx < chunk1.length; idx++) {
    const item = chunk1[idx];
    const rawModel = item.model || '';
    const title = toTitleCase(rawModel);
    const { coreNum, variants } = getCoreModelDetails(rawModel);

    // Match against pak-electronics.pk catalog: allow dash/space/slash variation, but core base digits MUST match 100%!
    const match = scrapedCatalog.find(siteItem => {
      const cleanSite = siteItem.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanCore = coreNum.replace(/[^0-9]/g, '');

      if (cleanCore && cleanCore.length >= 2) {
        if (!cleanSite.includes(cleanCore)) return false;

        if (variants.length > 0) {
          return variants.some(v => cleanSite.includes(v.toUpperCase()));
        }
        return true;
      }
      return false;
    });

    if (match && match.imgSrc) {
      const slug = `haier-${rawModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const targetPath = path.join(targetImagesDir, `${slug}.png`);
      const relativeUrl = `/images/${slug}.png`;

      try {
        const tempRaw = path.join(targetImagesDir, `${slug}_raw.png`);
        const client = match.imgSrc.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(match.imgSrc, (resp) => {
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
        });

        if (fs.existsSync(tempRaw)) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 95 })
            .toFile(targetPath);

          fs.unlinkSync(tempRaw);
        }

        foundCount++;

        if (!usedNames.has(title.toLowerCase())) {
          const priceNum = item.mrp || 65000;
          const discountPrice = Math.round(priceNum * 0.95);

          await db.execute(
            `INSERT INTO products (name, category, brand, price, discountPrice, image, description, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, 'Refrigerators', 'Haier', priceNum, discountPrice, relativeUrl, `Original genuine Haier ${title}. Official warranty.`, 10]
          );
          usedNames.add(title.toLowerCase());
        }

        const notes = `Matched core base number ${coreNum} on pak-electronics.pk`;
        console.log(`✅ FOUND_AND_UPLOADED [#${idx + 1}]: [Haier] ${title} -> Image: ${relativeUrl} | Notes: ${notes}`);
      } catch (err) {
        notFoundCount++;
        unmatchedRows.push(`"${idx + 1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","Image download error"`);
        console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier] ${rawModel} (Download error)`);
      }
    } else {
      notFoundCount++;
      const notes = `Core number ${coreNum} not found on pak-electronics.pk`;
      unmatchedRows.push(`"${idx + 1}","Haier","Refrigerators","${rawModel.replace(/"/g, '""')}","${item.mrp || ''}","","NOT_FOUND","${notes}"`);
      console.log(`❌ NOT_FOUND [#${idx + 1}]: [Haier] ${rawModel} (Image_URL left EMPTY - ${notes})`);
    }
  }

  // Update Haier_June26_Unmatched.csv
  let uHeader = 'S_No,Brand,Category,Model_Name,MRP_Price,Image_URL,Image_Status,Match_Notes\n';
  fs.writeFileSync(unmatchedFile, uHeader + unmatchedRows.join('\n'), 'utf8');

  console.log("\n==================================================");
  console.log("📊 PAK-ELECTRONICS.PK — REFRIGERATORS CHUNK 1 EXECUTION REPORT");
  console.log("==================================================");
  console.log(`✅ FOUND_AND_UPLOADED: ${foundCount}`);
  console.log(`❌ NOT_FOUND (Image_URL left EMPTY, exported to Haier_June26_Unmatched.csv): ${notFoundCount}`);
  console.log(`⚠️ BLOCKED: 0`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

matchPakElectronicsChunk1().catch(console.error);
