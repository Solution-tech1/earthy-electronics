const puppeteer = require('puppeteer');
const fs = require('fs');

async function testPlural() {
  console.log("==================================================");
  console.log("🔍 TESTING PLURAL CATEGORY URL: https://pak-electronics.pk/product-category/refrigerators/");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://pak-electronics.pk/product-category/refrigerators/', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`📌 Landed Category Page URL: ${landedUrl}`);

  const products = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('h2, h3, .product-title, .woocommerce-loop-product__title, a');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('refrigerator') || txt.toLowerCase().includes('hrf') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('pel') || txt.toLowerCase().includes('orient'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`\nFound ${products.length} Refrigerator Product Titles on Plural Page:`);
  products.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl,
    totalProducts: products.length,
    first10Products: products.slice(0, 10)
  };

  fs.writeFileSync('pak_ref_grid_report.json', JSON.stringify(report, null, 2), 'utf8');
}

testPlural().catch(console.error);
