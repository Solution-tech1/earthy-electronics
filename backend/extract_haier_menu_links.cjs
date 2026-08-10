const puppeteer = require('puppeteer');

async function extractMenu() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('https://www.haier.com/pk/', { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    const arr = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.href;
      const txt = a.textContent.trim();
      if (href && (href.includes('/pk/') || href.includes('haier.com'))) {
        arr.push({ txt, href });
      }
    });
    return arr;
  });

  console.log(`Found ${links.length} links on Haier PK homepage:`);
  links.filter(l => l.txt.length > 2).slice(0, 35).forEach(l => {
    console.log(`  [${l.txt}] -> ${l.href}`);
  });

  await browser.close();
}

extractMenu().catch(console.error);
