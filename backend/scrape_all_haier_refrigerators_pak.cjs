const https = require('https');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function scrapeAllHaierRefrigerators() {
  console.log("==================================================");
  console.log("🔍 SCANNING ALL PAGINATION PAGES OF PAK-ELECTRONICS REFRIGERATORS FOR HAIER");
  console.log("==================================================");

  const baseUrl = 'https://pak-electronics.pk/product-category/refrigerators/page/';
  let page = 1;
  let totalHaierFound = 0;
  const haierTitles = [];

  while (true) {
    const pageUrl = page === 1 ? 'https://pak-electronics.pk/product-category/refrigerators/' : `${baseUrl}${page}/`;
    console.log(`Scanning Page ${page}: ${pageUrl} ...`);

    try {
      const pageHtml = await new Promise((resolve, reject) => {
        const req = https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
          if (res.statusCode === 404) {
            resolve(null); // End of pagination
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
      });

      if (!pageHtml) {
        console.log(`Page ${page} returned 404. Reached end of pagination.`);
        break;
      }

      // Extract all h2.woocommerce-loop-product__title or product titles
      const titleMatches = [...pageHtml.matchAll(/<h2[^>]*class=["'][^"']*woocommerce-loop-product__title[^"']*["'][^>]*>(.*?)<\/h2>/gi)];
      
      let titles = titleMatches.map(m => m[1].trim());

      if (titles.length === 0) {
        const linkMatches = [...pageHtml.matchAll(/<a[^>]+href=["']https:\/\/pak-electronics\.pk\/product\/[^"']+["'][^>]*>(.*?)<\/a>/gi)];
        titles = linkMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 5);
      }

      if (titles.length === 0) {
        console.log(`No products found on Page ${page}. End of pagination.`);
        break;
      }

      // Filter for Haier titles
      const pageHaier = titles.filter(t => t.toLowerCase().includes('haier'));
      pageHaier.forEach(t => haierTitles.push({ page, title: t }));

      console.log(`   - Page ${page} total products: ${titles.length} | Haier products found: ${pageHaier.length}`);

      page++;
      await delay(300);

    } catch (err) {
      console.log(`Error scanning Page ${page}: ${err.message}. Ending pagination scan.`);
      break;
    }
  }

  console.log("\n==================================================");
  console.log(`📊 COMPLETE HAIER REFRIGERATOR LIST FROM PAK-ELECTRONICS.PK`);
  console.log(`TOTAL HAIER REFRIGERATORS FOUND: ${haierTitles.length}`);
  console.log("==================================================");
  haierTitles.forEach((item, idx) => {
    console.log(`${idx+1}. [Page ${item.page}] "${item.title}"`);
  });
  console.log("==================================================\n");
}

scrapeAllHaierRefrigerators().catch(console.error);
