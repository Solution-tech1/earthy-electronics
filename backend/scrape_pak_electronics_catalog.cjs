const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePakElectronicsCatalog() {
  console.log("==================================================");
  console.log("🌐 SCRAPING PRODUCT CATALOG FROM PAK-ELECTRONICS.PK");
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
  const urlsToScrape = [
    'https://pak-electronics.pk/brand/haier/',
    'https://pak-electronics.pk/product-category/refrigerator/',
    'https://pak-electronics.pk/product-category/air-conditioner/',
    'https://pak-electronics.pk/product-category/washing-machine/',
    'https://pak-electronics.pk/product-category/deep-freezer/',
    'https://pak-electronics.pk/product-category/led-tv/'
  ];

  for (const url of urlsToScrape) {
    console.log(`Navigating to ${url}...`);
    try {
      await delay(2000);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

      // Scroll page
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight || totalHeight > 12000) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });

      await delay(1500);

      const pageProducts = await page.evaluate(() => {
        const items = [];
        const cards = document.querySelectorAll('.product, .product-grid-item, .product-type-simple, li.product');
        cards.forEach(c => {
          const titleEl = c.querySelector('.woocommerce-loop-product__title, .product-title, h2, h3, a');
          const imgEl = c.querySelector('img');
          const title = titleEl ? titleEl.textContent.trim() : '';
          const imgSrc = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
          if (title.length > 3 && imgSrc) {
            items.push({ title, imgSrc });
          }
        });
        return items;
      });

      console.log(`   Found ${pageProducts.length} product items on ${url}`);
      catalog.push(...pageProducts);

    } catch (e) {
      console.error(`   Error scraping ${url}: ${e.message}`);
    }
  }

  await browser.close();

  // Deduplicate catalog items
  const uniqueCatalog = [];
  const seen = new Set();
  catalog.forEach(item => {
    if (!seen.has(item.title.toLowerCase())) {
      seen.add(item.title.toLowerCase());
      uniqueCatalog.push(item);
    }
  });

  console.log(`\nTotal Unique Products Scraped from pak-electronics.pk: ${uniqueCatalog.length}`);
  fs.writeFileSync(path.join(__dirname, 'pak_electronics_catalog.json'), JSON.stringify(uniqueCatalog, null, 2), 'utf8');

  console.log("==================================================\n");
}

scrapePakElectronicsCatalog().catch(console.error);
