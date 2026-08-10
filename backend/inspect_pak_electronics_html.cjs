const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectPak() {
  console.log("Navigating to https://pak-electronics.pk/brand/haier/ ...");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto('https://pak-electronics.pk/brand/haier/', { waitUntil: 'networkidle2', timeout: 35000 });
    
    const elements = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a').forEach(a => {
        const txt = a.textContent.trim();
        const href = a.href;
        if (txt.length > 5 && href.includes('/product/')) {
          items.push({ title: txt, href });
        }
      });
      return items;
    });

    console.log(`Found ${elements.length} product links on pak-electronics.pk:`);
    elements.slice(0, 20).forEach((e, i) => console.log(`   [${i+1}] ${e.title} -> ${e.href}`));

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }

  await browser.close();
}

inspectPak().catch(console.error);
