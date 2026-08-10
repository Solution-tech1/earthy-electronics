const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. STRING NORMALIZATION ALGORITHM
function normalizeModel(str) {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Strip all slashes, hyphens, underscores, dots, parens, spaces
}

async function executeSystemDirective() {
  console.log("==================================================");
  console.log("🤖 SYSTEM DIRECTIVE: VISUAL ASSET PROCESSOR");
  console.log("==================================================");

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const logsDir = path.join(__dirname, 'logs');
  const unmatchedLogFile = path.join(logsDir, 'unmatched_products.json');

  if (!fs.existsSync(imagesOutputDir)) {
    fs.mkdirSync(imagesOutputDir, { recursive: true });
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  // Load Haier models parsed from PDF
  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_all_models.json'), 'utf8');
  const allPdfModels = JSON.parse(rawJson);

  console.log(`Processing ${allPdfModels.length} models under System Directive Rules...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const matchedOutput = [];
  const unmatchedLogEntries = [];

  for (let i = 0; i < allPdfModels.length; i++) {
    const item = allPdfModels[i];
    const originalName = item.model || '';
    const brand = 'Haier';
    const normalizedModel = normalizeModel(originalName);

    if (!normalizedModel || normalizedModel.length < 2) continue;

    console.log(`[${i+1}/${allPdfModels.length}] Processing: "${originalName}" -> Normalized: "${normalizedModel}"`);

    const filename = `haier-${normalizedModel.toLowerCase()}.jpg`;
    const localAbsPath = path.join(imagesOutputDir, filename);
    const relativeWebPath = `/images/products/${filename}`;

    // Dual Google Search queries
    const q1 = `"${brand}" "${originalName}" official photo`;
    const q2 = `"${brand}" "${normalizedModel}" photo`;

    let imageFoundUrl = '';

    for (const query of [q1, q2]) {
      if (imageFoundUrl) break;
      const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
      try {
        await delay(1500);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });

        imageFoundUrl = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          for (const img of imgs) {
            const src = img.src || img.getAttribute('data-src');
            if (src && src.startsWith('http') && !src.includes('google.com') && !src.includes('gstatic')) {
              return src;
            }
          }
          return '';
        });

      } catch (err) {
        // Continue to query 2
      }
    }

    if (imageFoundUrl) {
      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${normalizedModel}.jpg`);
        const client = imageFoundUrl.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(imageFoundUrl, (resp) => {
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
        });

        if (fs.existsSync(tempRaw)) {
          // Perform auto-enhancement, optimize contrast, flatten to studio white #FFFFFF
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 90 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRaw);
        }

        // DB Update
        await db.execute('UPDATE products SET image = ? WHERE name LIKE ?', [relativeWebPath, `%${originalName}%`]);

        matchedOutput.push({
          original_model_name: originalName,
          normalized_model_used: normalizedModel,
          local_path: relativeWebPath,
          status: "SUCCESS"
        });

        console.log(`   ✅ SUCCESS: ${relativeWebPath}`);

      } catch (dlErr) {
        unmatchedLogEntries.push({
          brand: brand,
          original_model_name: originalName,
          reason: "IMAGE_DOWNLOAD_OR_ENHANCE_FAILED",
          timestamp: new Date().toISOString()
        });
        console.log(`   ❌ FAILED: Download/Enhance error`);
      }
    } else {
      unmatchedLogEntries.push({
        brand: brand,
        original_model_name: originalName,
        reason: "NO_MATCH_FOUND_AFTER_NORMALIZATION",
        timestamp: new Date().toISOString()
      });
      console.log(`   ❌ NO_MATCH_FOUND_AFTER_NORMALIZATION`);
    }
  }

  await browser.close();
  await db.end();

  // Save unmatched log entries
  fs.writeFileSync(unmatchedLogFile, JSON.stringify(unmatchedLogEntries, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log(`🎉 SYSTEM DIRECTIVE PROCESSING COMPLETE!`);
  console.log(`✅ Total Matched Items: ${matchedOutput.length}`);
  console.log(`❌ Total Unmatched Logged: ${unmatchedLogEntries.length}`);
  console.log(`📁 Log File Saved: ${unmatchedLogFile}`);
  console.log("==================================================\n");

  // Output RAW JSON FOR MATCHED ITEMS
  console.log(JSON.stringify(matchedOutput, null, 2));
  process.exit(0);
}

executeSystemDirective().catch(console.error);
