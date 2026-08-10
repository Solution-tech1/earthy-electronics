const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectPakAcPage() {
  console.log("==================================================");
  console.log("🔍 STEP 1: PAK-ELECTRONICS.PK — AIR CONDITIONERS CATEGORY INSPECTION");
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

  const targetCategoryUrl = 'https://pak-electronics.pk/product-category/air-conditioner/';
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
  const acProducts = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a[href*="/product/"], .product-title, h2, h3, a');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('ac') || txt.toLowerCase().includes('air conditioner') || txt.toLowerCase().includes('inverter') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('gree') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('ton'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list)).slice(0, 10);
  });

  console.log(`\nFirst 10 Products Visible on AC Category Page (${acProducts.length}):`);
  acProducts.forEach((p, i) => console.log(`   [${i+1}] ${p}`));

  await browser.close();

  const report = {
    landedUrl,
    first10Products: acProducts
  };

  fs.writeFileSync('pak_ac_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

inspectPakAcPage().catch(console.error);
