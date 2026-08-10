const puppeteer = require('puppeteer');
const fs = require('fs');

async function testIshopHaierRef() {
  console.log("==================================================");
  console.log("🔍 TESTING ISHOPPING.PK HAIER REFRIGERATOR CATEGORY PAGE");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const targetUrl = 'https://www.ishopping.pk/home-appliances/refrigerators/haier-refrigerators-price-in-pakistan.html';
  console.log(`Navigating to ${targetUrl} ...`);

  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  const products = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a, h2, h3, .product-name, .product-item-link');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('hrf') || txt.toLowerCase().includes('refrigerator'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`\nFound ${products.length} Refrigerator Product Titles on ishopping.pk Haier Page:`);
  products.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl,
    totalProducts: products.length,
    first10Products: products.slice(0, 10)
  };

  fs.writeFileSync('ishopping_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

testIshopHaierRef().catch(console.error);
