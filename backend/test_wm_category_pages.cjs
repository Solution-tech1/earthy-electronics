const puppeteer = require('puppeteer');
const fs = require('fs');

async function testWmPages() {
  console.log("==================================================");
  console.log("🔍 TESTING WASHING MACHINES CATEGORY PAGES");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. Test QistBazaar Washing Machine Category
  const qistUrl = 'https://www.qistbazaar.pk/product-category/washing-machine/';
  console.log(`Navigating to ${qistUrl} ...`);

  await page.goto(qistUrl, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  const qistProducts = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('a, h2, h3, .product-title, [class*="product-name"]');
    elements.forEach(el => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.toLowerCase().includes('wash') || txt.toLowerCase().includes('spin') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('dawlance') || txt.toLowerCase().includes('kg'))) {
        list.push(txt);
      }
    });
    return Array.from(new Set(list));
  });

  console.log(`📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Found ${qistProducts.length} Washing Machine Titles on QistBazaar:`);
  qistProducts.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl: qistUrl,
    first10Products: qistProducts.slice(0, 10)
  };

  fs.writeFileSync('pak_wm_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

testWmPages().catch(console.error);
