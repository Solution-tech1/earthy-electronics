const puppeteer = require('puppeteer');

async function searchSpecific() {
  console.log("==================================================");
  console.log("🔍 TESTING SPECIFIC MODEL SEARCH ON QISTBAZAAR.PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const testQueries = ['HRF-186', 'HRF-216', 'HWM80-1217', 'HSU-19HFS', 'HDF-285'];

  for (const q of testQueries) {
    const sUrl = `https://www.qistbazaar.pk/?s=${encodeURIComponent(q)}&post_type=product`;
    console.log(`Searching: ${sUrl}...`);
    try {
      await page.goto(sUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      const titles = await page.evaluate(() => {
        const arr = [];
        document.querySelectorAll('a, h2, h3, .product-title').forEach(el => {
          const txt = el.textContent.trim();
          if (txt.length > 5 && txt.length < 90 && !txt.includes('Advance')) {
            arr.push(txt);
          }
        });
        return Array.from(new Set(arr));
      });

      console.log(`   Found ${titles.length} results for ${q}:`);
      titles.slice(0, 5).forEach((t, i) => console.log(`      [${i+1}] ${t}`));

    } catch (e) {
      console.error(`   Error for ${q}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("==================================================");
}

searchSpecific().catch(console.error);
