const puppeteer = require('puppeteer');
const fs = require('fs');

async function navigateHaierHomepageClean() {
  console.log("==================================================");
  console.log("🌐 NAVIGATING FROM HAIER HOMEPAGE (https://www.haier.com/pk)");
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
  await page.setViewport({ width: 1366, height: 768 });

  console.log("1. Opening https://www.haier.com/pk ...");
  await page.goto('https://www.haier.com/pk', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log("2. Clicking on Refrigerator menu link...");
  
  // Get href of refrigerator link
  const refLinkHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    for (const a of links) {
      const text = a.textContent.trim().toLowerCase();
      const href = (a.getAttribute('href') || '').toLowerCase();
      if ((text.includes('refrigerator') || href.includes('refrigerator')) && href.length > 5 && !href.includes('javascript')) {
        return a.href;
      }
    }
    return null;
  });

  console.log(`Found Refrigerator Link Href: ${refLinkHref}`);

  if (refLinkHref) {
    await page.goto(refLinkHref, { waitUntil: 'networkidle2', timeout: 40000 });
  }

  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();
  console.log(`\n📌 LANDED REFRIGERATOR CATEGORY URL: ${landedUrl}`);

  // Scroll down to load product cards
  await page.evaluate(async () => {
    await new Promise(res => {
      let t = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 500);
        t += 500;
        if (t >= document.body.scrollHeight || t > 8000) {
          clearInterval(timer);
          res();
        }
      }, 150);
    });
  });

  // Extract first 10 product names from landed Refrigerator page
  const productNames = await page.evaluate(() => {
    const names = [];
    
    // Check all product card elements
    const cards = document.querySelectorAll('.product-item, .productCard, .product-card, .item, [class*="product"]');
    cards.forEach(c => {
      const text = c.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5 && text.length < 120 && !text.includes('Filter') && !text.includes('Sort')) {
        names.push(text);
      }
    });

    if (names.length === 0) {
      const headings = Array.from(document.querySelectorAll('h2, h3, h4, a, p')).map(e => e.textContent.trim());
      headings.forEach(h => {
        if (h.length > 8 && h.length < 100 && (h.includes('HRF') || h.includes('HR-') || h.includes('Door') || h.includes('Inverter') || h.includes('Refrigerator'))) {
          names.push(h);
        }
      });
    }

    return Array.from(new Set(names)).slice(0, 10);
  });

  console.log(`\nFirst 10 Products Found on Landed Category Page (${productNames.length}):`);
  productNames.forEach((n, i) => console.log(`   [${i+1}] ${n}`));

  await browser.close();

  const report = { landedUrl, productNames };
  fs.writeFileSync('haier_refrigerator_navigation_report.json', JSON.stringify(report, null, 2), 'utf8');
}

navigateHaierHomepageClean().catch(console.error);
