const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchPakHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function run() {
  console.log("==================================================");
  console.log("⚡ HTTP SCRAPING OF PAK-ELECTRONICS.PK");
  console.log("==================================================");

  try {
    const html = await fetchPakHtml('https://pak-electronics.pk/?s=Haier&post_type=product');
    console.log(`Fetched HTML Length: ${html.length} bytes`);

    // Parse product titles & images using regex from raw HTML
    const productRegex = /<a[^>]+href="(https:\/\/pak-electronics\.pk\/product\/[^"]+)"[^>]*>(.*?)<\/a>/gi;
    const imgRegex = /<img[^>]+src="(https:\/\/[^"]+\.(?:jpg|png|webp))"/gi;

    let match;
    const products = [];
    const seen = new Set();

    // Find all product links
    const titleMatches = Array.from(html.matchAll(/<h2 class="[^"]*woocommerce-loop-product__title[^"]*">(.*?)<\/h2>/gi));
    console.log(`Found ${titleMatches.length} WooCommerce product title tags:`);
    titleMatches.slice(0, 20).forEach((m, i) => {
      const cleanTitle = m[1].replace(/<[^>]+>/g, '').trim();
      console.log(`   [${i+1}] ${cleanTitle}`);
    });

  } catch (err) {
    console.error(`HTTP Fetch Error: ${err.message}`);
  }

  console.log("==================================================");
}

run();
