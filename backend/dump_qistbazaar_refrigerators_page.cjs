const puppeteer = require('puppeteer');
const fs = require('fs');

async function dumpQistPage() {
  console.log("==================================================");
  console.log("🔍 INSPECTING REFRIGERATORS CATEGORY ON QISTBAZAAR.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const targetUrl = 'https://www.qistbazaar.pk/product-category/refrigerator/';
  console.log(`Navigating to ${targetUrl} ...`);

  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  // Extract all product titles from main grid
  const products = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a, h2, h3, .product-title, [class*="product-name"]');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('refrigerator') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('pel') || txt.toLowerCase().includes('orient') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('cf'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`Found ${products.length} Refrigerator Product Titles on QistBazaar Page:\n`);
  products.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl,
    totalProducts: products.length,
    first10Products: products.slice(0, 10)
  };

  fs.writeFileSync('qistbazaar_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

dumpQistPage().catch(console.error);
