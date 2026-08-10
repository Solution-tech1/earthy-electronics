const puppeteer = require('puppeteer');

async function inspectHaierSite() {
  console.log("==================================================");
  console.log("🔍 INSPECTING REAL PRODUCT TITLES ON HAIER.COM/PK");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto('https://www.haier.com/pk/refrigerators', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Get page text / title elements
    const siteTitles = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('a, h2, h3, h4, span, div').forEach(el => {
        const txt = el.textContent.trim();
        if (txt.length > 5 && txt.length < 100 && (txt.includes('HRF') || txt.includes('Haier') || txt.includes('Refrigerator') || txt.includes('Inverter'))) {
          texts.push(txt);
        }
      });
      return Array.from(new Set(texts));
    });

    console.log(`Found ${siteTitles.length} product text strings on Haier PK website:`);
    siteTitles.slice(0, 25).forEach((t, i) => {
      console.log(`   [${i+1}] ${t}`);
    });

  } catch (e) {
    console.error(`Inspection Error: ${e.message}`);
  }

  await browser.close();
  console.log("==================================================");
}

inspectHaierSite().catch(console.error);
