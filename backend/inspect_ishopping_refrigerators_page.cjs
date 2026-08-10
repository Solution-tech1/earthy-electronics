const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectIshoppingRefPage() {
  console.log("==================================================");
  console.log("🔍 INSPECTING REFRIGERATORS CATEGORY ON ISHOPPING.PK");
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

  const targetCategoryUrl = 'https://www.ishopping.pk/home-appliances/refrigerators.html';
  console.log(`Navigating to ${targetCategoryUrl} ...`);

  try {
    await page.goto(targetCategoryUrl, { waitUntil: 'networkidle2', timeout: 40000 });
    await new Promise(r => setTimeout(r, 4000));
  } catch (e) {
    console.log(`Navigation alert: ${e.message}`);
  }

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  // Scroll page to load product cards
  await page.evaluate(async () => {
    await new Promise(res => {
      let t = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 500);
        t += 500;
        if (t >= document.body.scrollHeight || t > 8000) {
          clearInterval(timer);
          res();
        }
      }, 150);
    });
  });

  // Extract first 10 product names visible on Category Page
  const ishopProducts = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('.product-item-link, h2 a, h3 a, .product-name a, a.product-item-link');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && !txt.includes('Filter') && !txt.includes('Compare') && !txt.includes('Wishlist')) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list)).slice(0, 10);
  });

  console.log(`\nFirst 10 Products Visible on Category Page (${ishopProducts.length}):`);
  ishopProducts.forEach((p, i) => console.log(`   [${i+1}] ${p}`));

  await browser.close();

  const report = {
    landedUrl,
    first10Products: ishopProducts
  };

  fs.writeFileSync('ishopping_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

inspectIshoppingRefPage().catch(console.error);
