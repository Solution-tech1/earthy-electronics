const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;

async function fetchDesignComLogos() {
  console.log("==================================================");
  console.log("🌐 OPENING REAL BROWSER ON DESIGN.COM AI LOGO GENERATOR");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = 'https://www.design.com/ai-logo-generator';
  console.log(`Navigating to ${url}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    // Try filling input field if available
    const inputSelector = 'input[type="text"], input[name="companyName"], input[placeholder*="Company"], input[placeholder*="Brand"], input[placeholder*="Logo"]';
    const input = await page.$(inputSelector);
    if (input) {
      await input.type('EarthyElectronics', { delay: 100 });
      await delay(1000);
      const btn = await page.$('button[type="submit"], button:contains("Generate"), button:contains("Create")');
      if (btn) {
        await btn.click();
        await delay(5000);
      }
    }

    // Scroll to reveal logo previews
    await page.evaluate(async () => {
      window.scrollBy(0, 400);
    });
    await delay(2000);

    // Capture overall page screenshot
    const shotPath1 = path.join(brainDir, 'design_com_gallery_1.png');
    await page.screenshot({ path: shotPath1, fullPage: false });
    console.log(`✅ Captured design.com gallery screenshot: ${shotPath1}`);

    // Scroll more
    await page.evaluate(async () => {
      window.scrollBy(0, 600);
    });
    await delay(2000);

    const shotPath2 = path.join(brainDir, 'design_com_gallery_2.png');
    await page.screenshot({ path: shotPath2, fullPage: false });
    console.log(`✅ Captured design.com gallery 2 screenshot: ${shotPath2}`);

  } catch (e) {
    console.error(`Design.com Navigation Error: ${e.message}`);
  }

  await browser.close();
  console.log("==================================================\n");
}

fetchDesignComLogos().catch(console.error);
