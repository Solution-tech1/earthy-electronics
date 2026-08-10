const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapePakProper() {
  console.log("==================================================");
  console.log("🔍 PROPER SCRAPING OF PAK-ELECTRONICS.PK HAIER PRODUCTS");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const allSiteProducts = [];

  const pagesToScrape = [
    'https://pak-electronics.pk/?s=Haier&post_type=product',
    'https://pak-electronics.pk/page/2/?s=Haier&post_type=product',
    'https://pak-electronics.pk/page/3/?s=Haier&post_type=product',
    'https://pak-electronics.pk/page/4/?s=Haier&post_type=product'
  ];

  for (const url of pagesToScrape) {
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const pageProducts = await page.evaluate(() => {
        const items = [];
        // WooCommerce product cards
        const cards = document.querySelectorAll('li.product, div.product-grid-item, div.product-small, .product');
        cards.forEach(c => {
          const aTag = c.querySelector('a.woocommerce-LoopProduct-link, a.product-title, .title a, h2 a, h3 a, a');
          const imgTag = c.querySelector('img');
          const title = aTag ? aTag.textContent.trim() : '';
          const imgSrc = imgTag ? (imgTag.getAttribute('data-src') || imgTag.getAttribute('data-lazy-src') || imgTag.src) : '';
          if (title.length > 5 && !title.includes('%') && imgSrc) {
            items.push({ title, imgSrc });
          }
        });
        return items;
      });

      console.log(`   Scraped ${pageProducts.length} clean product cards from ${url}`);
      allSiteProducts.push(...pageProducts);

    } catch (e) {
      console.log(`   Could not load ${url}: ${e.message}`);
    }
  }

  await browser.close();

  // Deduplicate
  const uniqueProducts = [];
  const seen = new Set();
  allSiteProducts.forEach(p => {
    if (!seen.has(p.title.toLowerCase())) {
      seen.add(p.title.toLowerCase());
      uniqueProducts.push(p);
    }
  });

  console.log(`\n✅ Total Clean Haier Products Scraped from pak-electronics.pk: ${uniqueProducts.length}`);
  console.log("Sample Scraped Titles:");
  uniqueProducts.slice(0, 15).forEach((p, i) => {
    console.log(`   [${i+1}] ${p.title}`);
  });

  fs.writeFileSync('pak_electronics_catalog.json', JSON.stringify(uniqueProducts, null, 2), 'utf8');
}

scrapePakProper().catch(console.error);
