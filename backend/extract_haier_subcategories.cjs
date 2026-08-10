const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractSubcategories() {
  console.log("==================================================");
  console.log("🔍 EXTRACTING HAIER OFFICIAL REFRIGERATOR SUBCATEGORIES");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.haier.com/pk/refrigerators/', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 3000));

  // Extract all subcategory links
  const subLinks = await page.evaluate(() => {
    const arr = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent.trim();
      if (href.includes('refrigerators') && text.length > 2 && !href.endsWith('/refrigerators/')) {
        arr.push({ text, href });
      }
    });
    return arr;
  });

  console.log(`Found ${subLinks.length} Refrigerator Subcategory Links:`);
  subLinks.slice(0, 10).forEach((l, i) => console.log(`   [${i+1}] ${l.text} -> ${l.href}`));

  // Go to the first subcategory link (e.g. Top Mount or Side by Side)
  const targetSub = subLinks.length > 0 ? subLinks[0].href : 'https://www.haier.com/pk/refrigerators/';
  console.log(`\nNavigating to Subcategory: ${targetSub}...`);

  await page.goto(targetSub, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const landedUrl = page.url();

  // Extract product titles from subcategory page
  const titles = await page.evaluate(() => {
    const names = [];
    const elements = document.querySelectorAll('a, h2, h3, h4, span, div');
    elements.forEach(el => {
      if (el.children.length === 0) {
        const txt = el.textContent.trim();
        if (txt.length > 5 && txt.length < 90 && (txt.includes('HRF') || txt.includes('HR-') || txt.includes('Door') || txt.includes('Inverter') || txt.includes('Cu.Ft') || txt.includes('Litre'))) {
          names.push(txt);
        }
      }
    });
    return Array.from(new Set(names)).slice(0, 10);
  });

  console.log(`\n📌 Landed URL: ${landedUrl}`);
  console.log(`First 10 Refrigerator Product Names Found (${titles.length}):`);
  titles.forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  await browser.close();

  const report = { landedUrl, titles, subLinks };
  fs.writeFileSync('haier_refrigerator_navigation_report.json', JSON.stringify(report, null, 2), 'utf8');
}

extractSubcategories().catch(console.error);
