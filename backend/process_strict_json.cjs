const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');
const http = require('http');

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 3500 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

const file = path.join(__dirname, 'product files', 'CDN_Still_Unverified.csv');
const rows = [];

if (fs.existsSync(file)) {
  fs.createReadStream(file)
    .pipe(csv())
    .on('data', d => rows.push(d))
    .on('end', async () => {
      const results = [];
      for (const r of rows) {
        results.push({
          brand: r.Brand || "Generic",
          model: r.Model_Name || "",
          image_url: null,
          status: "FAILED"
        });
      }
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    });
} else {
  console.log(JSON.stringify([], null, 2));
}
