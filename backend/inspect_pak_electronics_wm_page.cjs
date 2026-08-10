const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectPakWmPage() {
  console.log("==================================================");
  console.log("🔍 CATEGORY 3: PAK-ELECTRONICS.PK — WASHING MACHINES CATEGORY INSPECTION");
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

  const targetCategoryUrl = 'https://pak-electronics.pk/product-category/washing-machines/';
  console.log(`Navigating to Category Page: ${targetCategoryUrl} ...`);

  await page.goto(targetCategoryUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  // Scroll page
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
  const wmProducts = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a[href*="/product/"], .product-title, h2, h3, a');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('wash') || txt.toLowerCase().includes('spin') || txt.toLowerCase().includes('tub') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('kg'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list)).slice(0, 10);
  });

  console.log(`\nFirst 10 Products Visible on Washing Machine Category Page (${wmProducts.length}):`);
  wmProducts.forEach((p, i) => console.log(`   [${i+1}] ${p}`));

  await browser.close();

  const report = {
    landedUrl,
    first10Products: wmProducts
  };

  fs.writeFileSync('pak_wm_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

inspectPakWmPage().catch(console.error);
