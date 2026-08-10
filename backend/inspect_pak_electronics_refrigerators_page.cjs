const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectPakRefPage() {
  console.log("==================================================");
  console.log("🔍 INSPECTING PRODUCTS ON PAK-ELECTRONICS.PK REFRIGERATORS CATEGORY");
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

  // Extract all links & heading titles on page
  const items = await page.evaluate(() => {
    const list = [];
    // Query all product title containers
    const links = document.querySelectorAll('a[href*="product"], h2, h3, .product-title, [class*="title"]');
    links.forEach(el => {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      const href = el.href || el.querySelector('a')?.href || '';
      const img = el.querySelector('img') || el.parentElement?.querySelector('img');
      const imgSrc = img ? (img.getAttribute('data-src') || img.src) : '';

      if (text.length > 5 && text.length < 120 && !text.includes('Cart') && !text.includes('Filter') && !text.includes('Sort')) {
        list.push({ title: text, href, imgSrc });
      }
    });
    return list;
  });

  console.log(`\n📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Total Products/Titles Found on Page: ${items.length}\n`);

  // Deduplicate
  const uniqueItems = [];
  const seen = new Set();
  items.forEach(it => {
    if (!seen.has(it.title.toLowerCase())) {
      seen.add(it.title.toLowerCase());
      uniqueItems.push(it);
    }
  });

  console.log("First 10 Products Visible on Category Page:");
  uniqueItems.slice(0, 10).forEach((it, i) => console.log(`   [${i+1}] ${it.title}`));

  await browser.close();

  const report = {
    landedUrl: page.url(),
    totalFound: uniqueItems.length,
    first10Products: uniqueItems.slice(0, 10)
  };

  fs.writeFileSync('pak_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

inspectPakRefPage().catch(console.error);
