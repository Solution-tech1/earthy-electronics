const fs = require('fs');
const https = require('https');
const xlsx = require('xlsx');
const path = require('path');

const outDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\scratch\\demo_images';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if(res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath)).on('finish', () => resolve(true));
      } else {
        console.error('Failed to download', url, 'Status:', res.statusCode);
        resolve(false);
      }
    }).on('error', (e) => {
      console.error('Error downloading', url, e);
      resolve(false);
    });
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
}

async function processFile(filePath, typeName) {
  let md = '## ' + typeName + '\n\n';
  md += '| Brand | Model | Price | Image |\n';
  md += '|---|---|---|---|\n';
  
  try {
    const wb = xlsx.readFile(filePath);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    for (let row of data) {
      if(!row.images) continue;
      const firstUrl = row.images.split('|')[0].trim();
      const brand = row.Brand || 'Unknown';
      const name = row.name || 'Unknown Model';
      const price = row['Variant Price'] || 'N/A';
      
      const ext = '.jpg';
      const filename = sanitizeFilename(brand + '_' + name) + ext;
      const fullPath = path.join(outDir, filename);
      
      let success = true;
      if (!fs.existsSync(fullPath)) {
        success = await downloadImage(firstUrl, fullPath);
      }
      
      if(success) {
        // Format path for markdown
        const mdPath = fullPath.replace(/\\/g, '/');
        md += `| ${brand} | ${name} | Rs ${price} | ![${brand} ${name}](file:///${mdPath}) |\n`;
      } else {
         md += `| ${brand} | ${name} | Rs ${price} | Image Failed |\n`;
      }
    }
  } catch(e) {
    console.error(e);
  }
  return md;
}

async function run() {
  let finalMd = '# Product Images Demo\n\n';
  finalMd += await processFile('E:\\earthyelectronics\\backend\\all products files\\LED UPLOADING.xlsx', 'LED TVs');
  finalMd += await processFile('E:\\earthyelectronics\\backend\\all products files\\water dispenser.xlsx', 'Water Dispensers');
  
  fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\products_demo.md', finalMd);
  console.log('Done creating products_demo.md');
}

run();
