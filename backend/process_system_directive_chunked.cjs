const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. ADVANCED STRING NORMALIZATION ALGORITHM WITH SLASH VARIANT SPLITTING
function getNormalizedQueries(modelStr) {
  if (!modelStr) return [];
  let clean = modelStr.toUpperCase().trim();
  
  // Clean noise
  clean = clean.replace(/\(NEW\)/gi, '')
               .replace(/\(IOT\)/gi, '')
               .replace(/\bWHITE\b/gi, '')
               .replace(/\bGREY\b/gi, '')
               .replace(/\bGRAY\b/gi, '')
               .trim();

  const queries = [];

  // Handle slash variants (e.g. HRF-246 IPRA/IPGA/IPPA -> ["HRF-246 IPRA", "HRF-246 IPGA"])
  if (clean.includes('/')) {
    const parts = clean.split('/');
    const prefix = parts[0].trim();
    const baseMatch = prefix.match(/^(.*?\d+)\s*([A-Z]*)$/i);

    if (baseMatch) {
      const baseNum = baseMatch[1].trim(); // e.g. "HRF-246"
      const firstVar = baseMatch[2].trim(); // e.g. "IPRA"

      queries.push(`${baseNum} ${firstVar}`.trim());
      for (let k = 1; k < parts.length; k++) {
        queries.push(`${baseNum} ${parts[k].trim()}`.trim());
      }
      queries.push(baseNum);
    } else {
      queries.push(clean.replace(/\//g, ' '));
    }
  } else {
    queries.push(clean);
  }

  // Also add pure normalized string without any symbols
  const pureNorm = clean.replace(/[^A-Z0-9]/g, '');
  if (!queries.includes(pureNorm)) queries.push(pureNorm);

  return queries;
}

async function processSystemDirectiveChunk(chunkIndex = 1, chunkSize = 50) {
  console.log("==================================================");
  console.log(`🤖 ENHANCED SYSTEM DIRECTIVE: CHUNK ${chunkIndex} (50 PRODUCTS) EXECUTION`);
  console.log("==================================================");

  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const logsDir = path.join(__dirname, 'logs');
  const unmatchedLogFile = path.join(logsDir, 'unmatched_products.json');

  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earthy_elec'
  });

  const rawJson = fs.readFileSync(path.join(__dirname, 'haier_all_models.json'), 'utf8');
  const allPdfModels = JSON.parse(rawJson);

  const startIdx = (chunkIndex - 1) * chunkSize;
  const chunkItems = allPdfModels.slice(startIdx, startIdx + chunkSize);

  console.log(`Processing Chunk ${chunkIndex}: Items #${startIdx + 1} to #${startIdx + chunkItems.length}...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const matchedOutput = [];
  let unmatchedLogEntries = [];

  if (fs.existsSync(unmatchedLogFile)) {
    try {
      unmatchedLogEntries = JSON.parse(fs.readFileSync(unmatchedLogFile, 'utf8'));
    } catch (e) { unmatchedLogEntries = []; }
  }

  for (let i = 0; i < chunkItems.length; i++) {
    const item = chunkItems[i];
    const originalName = item.model || '';
    const brand = 'Haier';
    const normalizedQueries = getNormalizedQueries(originalName);

    if (!normalizedQueries.length) continue;

    const globalNum = startIdx + i + 1;
    console.log(`[#${globalNum}] Model: "${originalName}" | Queries: ${JSON.stringify(normalizedQueries)}`);

    const primaryNorm = normalizedQueries[0].replace(/[^A-Z0-9]/g, '');
    const filename = `haier-${primaryNorm.toLowerCase()}.jpg`;
    const localAbsPath = path.join(imagesOutputDir, filename);
    const relativeWebPath = `/images/products/${filename}`;

    let imageFoundUrl = '';

    for (const qStr of normalizedQueries) {
      if (imageFoundUrl) break;
      const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"Haier" "${qStr}" official photo`)}`;
      try {
        await delay(1200);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

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

      } catch (err) {}
    }

    if (imageFoundUrl) {
      try {
        const tempRaw = path.join(imagesOutputDir, `temp_${primaryNorm}.jpg`);
        const client = imageFoundUrl.startsWith('https') ? https : http;

        await new Promise((res) => {
          client.get(imageFoundUrl, (resp) => {
            const f = fs.createWriteStream(tempRaw);
            resp.pipe(f);
            f.on('finish', () => { f.close(); res(); });
          });
        });

        if (fs.existsSync(tempRaw)) {
          await sharp(tempRaw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 90 })
            .toFile(localAbsPath);

          fs.unlinkSync(tempRaw);
        }

        await db.execute('UPDATE products SET image = ? WHERE name LIKE ?', [relativeWebPath, `%${originalName}%`]);

        matchedOutput.push({
          original_model_name: originalName,
          normalized_model_used: primaryNorm,
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
        console.log(`   ❌ FAILED: Download error`);
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

  fs.writeFileSync(unmatchedLogFile, JSON.stringify(unmatchedLogEntries, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log(`📊 ENHANCED SYSTEM DIRECTIVE CHUNK ${chunkIndex} REPORT`);
  console.log("==================================================");
  console.log(`✅ Matched Items: ${matchedOutput.length}`);
  console.log(`❌ Unmatched Logged to unmatched_products.json: ${unmatchedLogEntries.length}`);
  console.log("==================================================\n");

  console.log("MATCHED_ITEMS_JSON:");
  console.log(JSON.stringify(matchedOutput, null, 2));
  process.exit(0);
}

const chunkArg = parseInt(process.argv[2]) || 1;
processSystemDirectiveChunk(chunkArg).catch(console.error);
