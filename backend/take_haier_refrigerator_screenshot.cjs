const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;

async function takeScreenshot() {
  console.log("==================================================");
  console.log("📷 TAKING SCREENSHOT OF HAIER OFFICIAL REFRIGERATORS PAGE");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.haier.com/pk/refrigerators/', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 6000));

  const shotPath = path.join(brainDir, 'haier_official_refrigerators_page.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`Saved screenshot: ${shotPath}`);

  // Dump all text on screen
  const pageText = await page.evaluate(() => {
    return document.body.innerText.split('\n').map(t => t.trim()).filter(t => t.length > 5 && !t.includes('javascript'));
  });

  console.log(`Total text blocks on screen: ${pageText.length}`);
  console.log("Sample text blocks from screen:");
  pageText.slice(0, 25).forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = {
    landedUrl: 'https://www.haier.com/pk/refrigerators/',
    shotPath,
    pageTextSnippet: pageText.slice(0, 25)
  };

  fs.writeFileSync('haier_refrigerator_navigation_report.json', JSON.stringify(report, null, 2), 'utf8');
}

takeScreenshot().catch(console.error);
