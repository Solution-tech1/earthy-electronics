const puppeteer = require('puppeteer');
const fs = require('fs');

async function dumpPakGrid() {
  console.log("==================================================");
  console.log("🔍 DUMPING REFRIGERATOR PRODUCTS FROM PAK-ELECTRONICS.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://pak-electronics.pk/product-category/refrigerator/', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  // Extract all text links under main content div
  const mainProducts = await page.evaluate(() => {
    const titles = [];
    const mainContent = document.querySelector('.site-main, #main, .products, .content-area, body');
    if (mainContent) {
      const links = mainContent.querySelectorAll('a');
      links.forEach(a => {
        const txt = a.textContent.trim().replace(/\s+/g, ' ');
        const href = a.href || '';
        if (txt.length > 8 && txt.length < 120 && href.includes('/product/') && !txt.includes('Select options') && !txt.includes('Add to cart')) {
          titles.push({ title: txt, href });
        }
      });
    }
    return titles;
  });

  console.log(`\n📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Extracted ${mainProducts.length} Refrigerator Product Links:\n`);

  const unique = [];
  const seen = new Set();
  mainProducts.forEach(p => {
    if (!seen.has(p.title.toLowerCase())) {
      seen.add(p.title.toLowerCase());
      unique.push(p);
    }
  });

  console.log("First 10 Refrigerator Products Visible on Category Page:");
  unique.slice(0, 10).forEach((p, i) => console.log(`   [${i+1}] ${p.title}`));

  await browser.close();

  const report = {
    landedUrl: page.url(),
    totalProducts: unique.length,
    first10Products: unique.slice(0, 10).map(p => p.title)
  };

  fs.writeFileSync('pak_ref_grid_report.json', JSON.stringify(report, null, 2), 'utf8');
}

dumpPakGrid().catch(console.error);
