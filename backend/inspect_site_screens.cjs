const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function inspectSiteScreens() {
  console.log("==================================================");
  console.log("🔍 REAL-TIME VISUAL INSPECTION OF QISTBAZAAR & ISHOPPING");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. QistBazaar Inspection
  console.log("\n1. Navigating to https://www.qistbazaar.pk/?s=Haier&post_type=product ...");
  try {
    await page.goto('https://www.qistbazaar.pk/?s=Haier&post_type=product', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(3000);
    const qistShot = path.join(brainDir, 'qistbazaar_haier_search.png');
    await page.screenshot({ path: qistShot });
    console.log(`   Captured screenshot: ${qistShot}`);

    const qistTitles = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('a, h2, h3, div').forEach(el => {
        const txt = el.textContent.trim();
        if (txt.length > 5 && txt.length < 90 && (txt.includes('Haier') || txt.includes('HRF') || txt.includes('HWM') || txt.includes('Refrigerator'))) {
          arr.push(txt);
        }
      });
      return Array.from(new Set(arr));
    });

    console.log(`   QistBazaar Product Titles Found (${qistTitles.length}):`);
    qistTitles.slice(0, 15).forEach((t, i) => console.log(`      [${i+1}] ${t}`));

  } catch (e) {
    console.error(`   QistBazaar Error: ${e.message}`);
  }

  // 2. iShopping Inspection
  console.log("\n2. Navigating to https://www.ishopping.pk/catalogsearch/result/?q=Haier ...");
  try {
    await page.goto('https://www.ishopping.pk/catalogsearch/result/?q=Haier', { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(3000);
    const ishopShot = path.join(brainDir, 'ishopping_haier_search.png');
    await page.screenshot({ path: ishopShot });
    console.log(`   Captured screenshot: ${ishopShot}`);

    const ishopTitles = await page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('a, h2, h3, div').forEach(el => {
        const txt = el.textContent.trim();
        if (txt.length > 5 && txt.length < 90 && (txt.includes('Haier') || txt.includes('HRF') || txt.includes('HWM') || txt.includes('Refrigerator'))) {
          arr.push(txt);
        }
      });
      return Array.from(new Set(arr));
    });

    console.log(`   iShopping Product Titles Found (${ishopTitles.length}):`);
    ishopTitles.slice(0, 15).forEach((t, i) => console.log(`      [${i+1}] ${t}`));

  } catch (e) {
    console.error(`   iShopping Error: ${e.message}`);
  }

  await browser.close();
  console.log("==================================================");
}

inspectSiteScreens().catch(console.error);
