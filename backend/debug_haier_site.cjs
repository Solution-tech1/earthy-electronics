const puppeteer = require('puppeteer');

async function debugHaierSite() {
  const browser = await puppeteer.launch({
    headless: false, // visible mode to see exact rendering
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  console.log("Navigating to https://www.haier.com/pk/ ...");
  await page.goto('https://www.haier.com/pk/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const currentUrl = page.url();
  console.log(`Actual Landed URL: ${currentUrl}`);

  const pageTitle = await page.title();
  console.log(`Page Title: ${pageTitle}`);

  // Take screenshot to see what's on screen
  await page.screenshot({ path: 'haier_pk_landed.png' });

  await browser.close();
}

debugHaierSite().catch(console.error);
