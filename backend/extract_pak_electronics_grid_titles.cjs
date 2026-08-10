const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractPakGridTitles() {
  console.log("==================================================");
  console.log("🔍 EXTRACTING MAIN PRODUCT GRID TITLES FROM PAK-ELECTRONICS.PK");
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

  // Extract titles from main WooCommerce product grid
  const gridTitles = await page.evaluate(() => {
    const arr = [];
    // Target WooCommerce loop product titles inside main grid area
    const cards = document.querySelectorAll('ul.products li.product, div.products .product, .woocommerce-loop-product__title');
    cards.forEach(c => {
      const titleEl = c.querySelector('.woocommerce-loop-product__title, h2, h3, a') || c;
      const text = titleEl.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5 && !text.includes('Filter') && !text.includes('Navigation') && !text.includes('Search')) {
        arr.push(text);
      }
    });
    return arr;
  });

  console.log(`\n📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Found ${gridTitles.length} Main Grid Product Titles:\n`);

  // Deduplicate
  const uniqueGrid = Array.from(new Set(gridTitles));

  console.log("First 10 Products Visible in Main Refrigerator Grid:");
  uniqueGrid.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl: page.url(),
    gridTitlesCount: uniqueGrid.length,
    first10Products: uniqueGrid.slice(0, 10)
  };

  fs.writeFileSync('pak_ref_grid_report.json', JSON.stringify(report, null, 2), 'utf8');
}

extractPakGridTitles().catch(console.error);
