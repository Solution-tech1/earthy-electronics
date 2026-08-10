const puppeteer = require('puppeteer');
const fs = require('fs');

async function testPakAcPlural() {
  console.log("==================================================");
  console.log("🔍 TESTING PLURAL AC CATEGORY URLS ON PAK-ELECTRONICS.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const urlsToTest = [
    'https://pak-electronics.pk/product-category/air-conditioners/',
    'https://pak-electronics.pk/product-category/split-ac/',
    'https://pak-electronics.pk/product-category/inverter-ac/'
  ];

  let landedUrl = '';
  let acProducts = [];

  for (const testUrl of urlsToTest) {
    console.log(`Testing ${testUrl} ...`);
    try {
      await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const items = await page.evaluate(() => {
        const list = [];
        const elements = document.querySelectorAll('h2, h3, .product-title, .woocommerce-loop-product__title, a[href*="/product/"]');
        elements.forEach(el => {
          const txt = el.textContent.trim().replace(/\s+/g, ' ');
          if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('ac') || txt.toLowerCase().includes('inverter') || txt.toLowerCase().includes('ton') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('gree') || txt.toLowerCase().includes('dawlance'))) {
            list.push(txt);
          }
        });
        return Array.from(new Set(list));
      });

      if (items.length > 0) {
        landedUrl = page.url();
        acProducts = items;
        break;
      }
    } catch (e) {}
  }

  console.log(`\n📌 Landed Category Page URL: ${landedUrl}`);
  console.log(`First 10 Products Visible on AC Category Page (${acProducts.length}):`);
  acProducts.slice(0, 10).forEach((p, i) => console.log(`   [${i+1}] ${p}`));

  await browser.close();

  const report = {
    landedUrl,
    first10Products: acProducts.slice(0, 10)
  };

  fs.writeFileSync('pak_ac_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

testPakAcPlural().catch(console.error);
