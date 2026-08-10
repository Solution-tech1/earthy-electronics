const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectQistAcPage() {
  console.log("==================================================");
  console.log("🔍 STEP 3: QISTBAZAAR.PK — AIR CONDITIONERS CATEGORY INSPECTION");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const targetUrl = 'https://www.qistbazaar.pk/product-category/air-conditioner/';
  console.log(`Navigating to ${targetUrl} ...`);

  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  // Extract product titles
  const products = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a, h2, h3, .product-title, [class*="product-name"]');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('ac') || txt.toLowerCase().includes('inverter') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('gree') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('ton'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`\nFound ${products.length} AC Product Titles on QistBazaar Page:`);
  products.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl,
    first10Products: products.slice(0, 10)
  };

  fs.writeFileSync('qist_ac_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

inspectQistAcPage().catch(console.error);
