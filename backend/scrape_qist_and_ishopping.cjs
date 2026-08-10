const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeNewPortals() {
  console.log("==================================================");
  console.log("🌐 SCRAPING PRODUCT CATALOGS FROM QISTBAZAAR.PK & ISHOPPING.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const catalog = [];

  const searchUrls = [
    // QistBazaar
    'https://www.qistbazaar.pk/?s=Haier&post_type=product',
    'https://www.qistbazaar.pk/?s=HRF&post_type=product',
    'https://www.qistbazaar.pk/?s=HWM&post_type=product',
    'https://www.qistbazaar.pk/?s=HSU&post_type=product',
    // iShopping
    'https://www.ishopping.pk/catalogsearch/result/?q=Haier',
    'https://www.ishopping.pk/catalogsearch/result/?q=Haier+HRF',
    'https://www.ishopping.pk/catalogsearch/result/?q=Haier+HWM',
    'https://www.ishopping.pk/catalogsearch/result/?q=Haier+HSU'
  ];

  for (const sUrl of searchUrls) {
    console.log(`Navigating to ${sUrl}...`);
    try {
      await delay(2000);
      await page.goto(sUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      // Scroll page
      await page.evaluate(async () => {
        await new Promise((res) => {
          let total = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 300);
            total += 300;
            if (total >= document.body.scrollHeight || total > 12000) {
              clearInterval(timer);
              res();
            }
          }, 150);
        });
      });

      await delay(1500);

      const items = await page.evaluate(() => {
        const arr = [];
        // Support WooCommerce, Magento, and custom product grid selectors
        const cards = document.querySelectorAll('.product, .product-item, .item, .product-grid-item, li.item');
        cards.forEach(c => {
          const titleEl = c.querySelector('.product-name, .product-item-link, .product-title, h2, h3, a');
          const imgEl = c.querySelector('img');
          const title = titleEl ? titleEl.textContent.trim() : '';
          const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') || imgEl.src) : '';
          if (title.length > 5 && !title.includes('%') && imgSrc) {
            arr.push({ title, imgSrc });
          }
        });
        return arr;
      });

      console.log(`   Found ${items.length} items on ${sUrl}`);
      catalog.push(...items);

    } catch (e) {
      console.error(`   Error on ${sUrl}: ${e.message}`);
    }
  }

  await browser.close();

  // Deduplicate
  const uniqueCatalog = [];
  const seen = new Set();
  catalog.forEach(item => {
    if (!seen.has(item.title.toLowerCase())) {
      seen.add(item.title.toLowerCase());
      uniqueCatalog.push(item);
    }
  });

  console.log(`\n✅ Total Unique Products Scraped: ${uniqueCatalog.length}`);
  fs.writeFileSync(path.join(__dirname, 'qist_ishopping_catalog.json'), JSON.stringify(uniqueCatalog, null, 2), 'utf8');

  console.log("==================================================\n");
}

scrapeNewPortals().catch(console.error);
