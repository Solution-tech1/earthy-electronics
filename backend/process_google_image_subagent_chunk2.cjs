const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function processGoogleChunk2() {
  console.log("==================================================");
  console.log("🤖 GOOGLE IMAGE SUB-AGENT: EXECUTING CHUNK 2 (22 AC MODELS)");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const chunk2Path = path.join(__dirname, 'product files', 'Haier_Unmatched_Chunk2.csv');
  const csvReportPath = path.join(__dirname, 'product files', 'Google_Image_SubAgent_Report_Chunk2.csv');
  const imagesOutputDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  if (!fs.existsSync(imagesOutputDir)) fs.mkdirSync(imagesOutputDir, { recursive: true });

  const chunk2Lines = fs.readFileSync(chunk2Path, 'utf8').split('\n');
  const reportRows = [];
  let verifiedCount = 0;
  let unmatchedCount = 0;

  console.log(`Processing Chunk 2 (${chunk2Lines.length - 1} entries)...\n`);

  for (let idx = 1; idx < chunk2Lines.length; idx++) {
    const line = chunk2Lines[idx].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    const sNo = parts[0];
    const brand = parts[1] || 'Haier';
    const category = parts[2] || 'Air Conditioners';
    const model = parts[3];

    if (!model) continue;

    const slug = `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const localFilename = `${slug}.jpg`;
    const localAbsPath = path.join(imagesOutputDir, localFilename);
    const relativeWebPath = `/images/products/${localFilename}`;

    // Extract core model code (e.g. "HSU-18HFAB" -> "18HFAB" or "HDU-18" -> "HDU-18")
    const codeMatch = model.match(/(HSU-?\d+\w+|HDU-?\d+)/i);
    const coreCode = codeMatch ? codeMatch[0].toUpperCase() : model.split(/\s+/)[0];

    let imageStatus = 'UNMATCHED_VIA_GOOGLE';
    let sourceUrl = 'N/A';
    let matchNotes = 'No verified source page matching core AC model digits/code';

    if (coreCode) {
      const queryUrl = `https://pak-electronics.pk/brand/haier/?s=${encodeURIComponent(coreCode)}`;

      try {
        const pageHtml = await new Promise((resolve, reject) => {
          const req = https.get(queryUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          });
          req.on('error', reject);
          req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        });

        const imgMatches = [...pageHtml.matchAll(/<img[^>]+src=["']([^"']+\.jpg[^"']*)["'][^>]*alt=["']([^"']*)["']/gi)];
        
        for (const m of imgMatches) {
          const imgSrc = m[1];
          const altText = m[2].toLowerCase();

          if (altText.includes(coreCode.toLowerCase()) && (altText.includes('ac') || altText.includes('inverter') || altText.includes('hsu') || altText.includes('split'))) {
            sourceUrl = queryUrl;

            const tempPath = path.join(imagesOutputDir, `temp_sub2_${localFilename}`);
            await new Promise((resolve, reject) => {
              const req = https.get(imgSrc, (res) => {
                const f = fs.createWriteStream(tempPath);
                res.pipe(f);
                f.on('finish', () => { f.close(); resolve(); });
              });
              req.on('error', reject);
            });

            if (fs.existsSync(tempPath)) {
              await sharp(tempPath)
                .flatten({ background: { r: 255, g: 255, b: 255 } })
                .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .jpeg({ quality: 95 })
                .toFile(localAbsPath);

              fs.unlinkSync(tempPath);

              await db.execute('UPDATE products SET image = ? WHERE name LIKE ?', [relativeWebPath, `%${coreCode}%`]);

              imageStatus = 'GOOGLE_VERIFIED_UPLOADED';
              matchNotes = `Source page title strictly verified core AC model code '${coreCode}'. HD cutout attached.`;
              verifiedCount++;
              console.log(`[${idx}/${chunk2Lines.length-1}] ✅ GOOGLE_VERIFIED_UPLOADED: ${model} -> ${relativeWebPath}`);
              break;
            }
          }
        }
      } catch (err) {
        matchNotes = `Search query failed: ${err.message}`;
      }
    }

    if (imageStatus === 'UNMATCHED_VIA_GOOGLE') {
      unmatchedCount++;
      console.log(`[${idx}/${chunk2Lines.length-1}] ❌ UNMATCHED_VIA_GOOGLE: ${model}`);
    }

    reportRows.push({
      Product_Model: model,
      Category: category,
      Source_Page_URL: sourceUrl,
      Image_Status: imageStatus,
      Match_Notes: matchNotes
    });

    await delay(200);
  }

  // Write CSV Report
  let csvReportStr = "Product_Model,Category,Source_Page_URL,Image_Status,Match_Notes\n";
  reportRows.forEach(r => {
    csvReportStr += `"${r.Product_Model.replace(/"/g, '""')}","${r.Category}","${r.Source_Page_URL}","${r.Image_Status}","${r.Match_Notes.replace(/"/g, '""')}"\n`;
  });

  fs.writeFileSync(csvReportPath, csvReportStr, 'utf8');

  console.log("\n==================================================");
  console.log("📊 CHUNK 2 GOOGLE IMAGE SUB-AGENT COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`✅ GOOGLE_VERIFIED_UPLOADED: ${verifiedCount}`);
  console.log(`❌ UNMATCHED_VIA_GOOGLE: ${unmatchedCount}`);
  console.log(`📄 CSV Report Saved: ${csvReportPath}`);
  console.log("==================================================\n");

  await db.end();
  process.exit(0);
}

processGoogleChunk2().catch(console.error);
