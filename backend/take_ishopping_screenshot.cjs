const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;

async function ishopShot() {
  console.log("==================================================");
  console.log("📷 TAKING SCREENSHOT OF ISHOPPING.PK HAIER REFRIGERATOR CATEGORY");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.ishopping.pk/home-appliances/refrigerators/haier-refrigerators-price-in-pakistan.html', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const sPath = path.join(brainDir, 'ishopping_haier_refrigerators_category.png');
  await page.screenshot({ path: sPath });
  console.log(`Saved screenshot: ${sPath}`);

  const pageTitles = await page.evaluate(() => {
    const arr = [];
    document.querySelectorAll('a').forEach(a => {
      const txt = a.textContent.trim().replace(/\s+/g, ' ');
      if (txt.length > 5 && txt.length < 120 && (txt.includes('Haier') || txt.includes('HRF') || txt.includes('Refrigerator'))) {
        arr.push(txt);
      }
    });
    return Array.from(new Set(arr));
  });

  console.log(`📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Found ${pageTitles.length} Products Visible on Screen:`);
  pageTitles.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl: page.url(),
    first10Products: pageTitles.slice(0, 10)
  };

  fs.writeFileSync('ishopping_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

ishopShot().catch(console.error);
