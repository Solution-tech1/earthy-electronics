const puppeteer = require('puppeteer');
const fs = require('fs');

async function dumpIshopTitles() {
  console.log("==================================================");
  console.log("🔍 DUMPING REFRIGERATOR PRODUCTS FROM ISHOPPING.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.ishopping.pk/home-appliances/refrigerators.html', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();

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

  // Extract all text links containing Refrigerator or brand names
  const products = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a, h2, h3, .product-name, [class*="product"]');
    elements.forEach(el => {
      if (el.children.length === 0 || el.tagName === 'A') {
        const txt = el.textContent.trim().replace(/\s+/g, ' ');
        if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('refrigerator') || txt.toLowerCase().includes('fridge') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('orient') || txt.toLowerCase().includes('pel'))) {
          list.push(txt);
        }
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`📌 Landed Category Page URL: ${landedUrl}`);
  console.log(`Found ${products.length} Refrigerator Product Titles on ishopping.pk:\n`);

  products.slice(0, 10).forEach((p, i) => console.log(`   [${i+1}] ${p}`));

  await browser.close();

  const report = {
    landedUrl,
    totalFound: products.length,
    first10Products: products.slice(0, 10)
  };

  fs.writeFileSync('ishopping_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

dumpIshopTitles().catch(console.error);
