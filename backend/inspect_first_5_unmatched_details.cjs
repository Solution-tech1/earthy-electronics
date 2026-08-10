const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspect5Details() {
  console.log("==================================================");
  console.log("🔬 INSPECTING EXACT DETAILS FOR FIRST 5 UNMATCHED PRODUCTS");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. haier.com/pk category URL
  const haierUrl = 'https://www.haier.com/pk/refrigerators/';
  let haierTitles = [];
  try {
    await page.goto(haierUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    haierTitles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, h2, h3, .title')).map(el => el.textContent.trim()).filter(t => t.length > 5).slice(0, 8);
    });
  } catch (e) {}

  // 2. ishopping.pk category URL
  const ishopUrl = 'https://www.ishopping.pk/home-appliances/refrigerators.html';
  let ishopTitles = [];
  try {
    await page.goto(ishopUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    ishopTitles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-item-link, a, h2')).map(el => el.textContent.trim()).filter(t => t.length > 5).slice(0, 8);
    });
  } catch (e) {}

  // 3. qistbazaar.pk category URL
  const qistUrl = 'https://www.qistbazaar.pk/product-category/refrigerator/';
  let qistTitles = [];
  try {
    await page.goto(qistUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    qistTitles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-title, h3, a')).map(el => el.textContent.trim()).filter(t => t.length > 5).slice(0, 8);
    });
  } catch (e) {}

  // 4. pak-electronics.pk category URL
  const pakUrl = 'https://pak-electronics.pk/product-category/refrigerator/';
  let pakTitles = [];
  try {
    await page.goto(pakUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    pakTitles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.woocommerce-loop-product__title, a')).map(el => el.textContent.trim()).filter(t => t.length > 5).slice(0, 8);
    });
  } catch (e) {}

  await browser.close();

  const report = {
    haierUrl, haierTitles,
    ishopUrl, ishopTitles,
    qistUrl, qistTitles,
    pakUrl, pakTitles
  };

  fs.writeFileSync('unmatched_5_details.json', JSON.stringify(report, null, 2), 'utf8');
  console.log("Inspection complete!");
}

inspect5Details().catch(console.error);
