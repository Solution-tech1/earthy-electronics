const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractHaierRefListing() {
  console.log("==================================================");
  console.log("🌐 EXTRACTING EXACT HAIER REFRIGERATOR MODEL LISTING TITLES");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.haier.com/pk/refrigerators/', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  // Scroll down to load product grid
  await page.evaluate(async () => {
    await new Promise(res => {
      let t = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 500);
        t += 500;
        if (t >= document.body.scrollHeight || t > 10000) {
          clearInterval(timer);
          res();
        }
      }, 150);
    });
  });

  // Extract titles from product cards below top nav
  const refModels = await page.evaluate(() => {
    const titles = [];
    // Select elements inside product list containers
    const cards = document.querySelectorAll('.product-list, .products-list, .product-item, .card, [class*="product-card"], [class*="product_card"], [class*="goods"]');
    cards.forEach(c => {
      const text = c.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5 && text.length < 150 && !text.includes('Skip to') && !text.includes('Filter')) {
        titles.push(text);
      }
    });

    if (titles.length < 5) {
      // Direct search for text containing HRF or Refrigerator or Liters or Cu.Ft
      const allElems = Array.from(document.querySelectorAll('*'));
      allElems.forEach(el => {
        if (el.children.length === 0) {
          const t = el.textContent.trim();
          if (t.length > 6 && t.length < 90 && (t.includes('HRF-') || t.includes('HR-') || t.includes('Door') || t.includes('Inverter') || t.includes('Side by Side') || t.includes('Top Mount'))) {
            titles.push(t);
          }
        }
      });
    }

    return Array.from(new Set(titles)).slice(0, 10);
  });

  console.log(`\n📌 Landed URL: ${page.url()}`);
  console.log(`Extracted ${refModels.length} Exact Refrigerator Models:`);
  refModels.forEach((m, i) => console.log(`   [${i+1}] ${m}`));

  await browser.close();

  const report = { landedUrl: page.url(), refModels };
  fs.writeFileSync('haier_refrigerator_navigation_report.json', JSON.stringify(report, null, 2), 'utf8');
}

extractHaierRefListing().catch(console.error);
