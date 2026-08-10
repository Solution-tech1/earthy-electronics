const https = require('https');

function fetchRawTitles() {
  const url = 'https://pak-electronics.pk/product-category/refrigerators/';
  console.log(`Fetching RAW text from: ${url} ...\n`);

  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Find all product title elements or <h2> / <h3> / <a> text in product grid
      const matches = [...data.matchAll(/<h2[^>]*class=["'][^"']*woocommerce-loop-product__title[^"']*["'][^>]*>(.*?)<\/h2>/gi)];
      
      let titles = [];
      if (matches.length > 0) {
        titles = matches.map(m => m[1].trim());
      } else {
        // Fallback regex for product link text
        const linkMatches = [...data.matchAll(/<a[^>]+href=["']https:\/\/pak-electronics\.pk\/product\/[^"']+["'][^>]*>(.*?)<\/a>/gi)];
        titles = linkMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 5);
      }

      console.log("==================================================");
      console.log("RAW PRODUCT TITLES FROM PAK-ELECTRONICS.PK:");
      console.log("==================================================");
      titles.slice(0, 10).forEach((t, idx) => console.log(`Title ${idx+1}: "${t}"`));
      console.log("==================================================\n");
    });
  }).on('error', (err) => {
    console.error("HTTP Error:", err.message);
  });
}

fetchRawTitles();
