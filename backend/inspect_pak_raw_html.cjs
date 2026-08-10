
const https = require('https');

function fetchPakHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function run() {
  const html = await fetchPakHtml('https://pak-electronics.pk/?s=Haier&post_type=product');
  fs.writeFileSync('pak_raw_search.html', html, 'utf8');

  // Extract product titles from links like href="https://pak-electronics.pk/product/..."
  const productMatches = Array.from(html.matchAll(/href="(https://pak-electronics.pk/product/[^"]+)"[^>]*>([^<]+)</a>/gi));
  
  console.log("==================================================");
  console.log("📦 REAL PAK-ELECTRONICS.PK PRODUCT MATCHES IN HTML:");
  console.log("==================================================");

  const seen = new Set();
  const products = [];

  productMatches.forEach(m => {
    const url = m[1];
    const rawTitle = m[2].trim();
    if (rawTitle.length > 5 && !rawTitle.toLowerCase().includes('select options') && !rawTitle.toLowerCase().includes('add to cart') && !seen.has(rawTitle)) {
      seen.add(rawTitle);
      
      // Try to find image src near url in html
      const imgMatch = html.match(new RegExp('src="([^"]+\.(?:jpg|png|jpeg|webp))"[^>]*alt="' + rawTitle.replace(/[^a-zA-Z0-9]/g, '.*') + '"', 'i')) ||
                       html.match(new RegExp('href="' + url.replace(/[^a-zA-Z0-9]/g, '.*') + '"[\s\S]{1,400}?src="([^"]+\.(?:jpg|png|jpeg|webp))"', 'i'));
      const imgSrc = imgMatch ? imgMatch[1] : '';

      products.push({ title: rawTitle, url, imgSrc });
      console.log(`   [${products.length}] ${rawTitle}`);
    }
  });

  console.log(`\n✅ Total Clean Haier Products Extracted: ${products.length}`);
  fs.writeFileSync('pak_scraped_products.json', JSON.stringify(products, null, 2), 'utf8');
}

run().catch(console.error);
