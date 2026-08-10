const puppeteer = require('puppeteer');

async function searchPak() {
  console.log("Navigating to https://pak-electronics.pk/?s=Haier&post_type=product ...");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto('https://pak-electronics.pk/?s=Haier&post_type=product', { waitUntil: 'networkidle2', timeout: 35000 });
    
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);

    const links = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a').forEach(a => {
        const txt = a.textContent.trim();
        const href = a.href;
        if (txt.length > 3 && (href.includes('/product/') || txt.toLowerCase().includes('haier') || txt.toLowerCase().includes('hrf') || txt.toLowerCase().includes('hwm'))) {
          items.push({ title: txt, href });
        }
      });
      return items;
    });

    console.log(`Found ${links.length} product links on pak-electronics search page:`);
    links.slice(0, 25).forEach((l, i) => console.log(`   [${i+1}] ${l.title} -> ${l.href}`));

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }

  await browser.close();
}

searchPak().catch(console.error);
