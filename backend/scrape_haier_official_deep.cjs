const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function scrapeHaierOfficialDeep() {
  console.log("==================================================");
  console.log("🔍 DEEP SCRAPING HAIER OFFICIAL WEBSITE (www.haier.com/pk)");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const categories = [
    { name: 'Refrigerators', url: 'https://www.haier.com/pk/refrigerators/' },
    { name: 'Air Conditioners', url: 'https://www.haier.com/pk/air-conditioners/' },
    { name: 'Washing Machines', url: 'https://www.haier.com/pk/washing-machines/' },
    { name: 'Deep Freezers', url: 'https://www.haier.com/pk/freezers/' },
    { name: 'LED TVs', url: 'https://www.haier.com/pk/tvs/' },
    { name: 'Water Dispensers', url: 'https://www.haier.com/pk/water-dispensers/' }
  ];

  const allHaierOfficialCatalog = [];

  for (const cat of categories) {
    console.log(`Navigating to ${cat.url}...`);
    try {
      await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 40000 });
      await delay(3000);

      // Deep scroll
      await page.evaluate(async () => {
        await new Promise(res => {
          let t = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 500);
            t += 500;
            if (t >= document.body.scrollHeight || t > 15000) {
              clearInterval(timer);
              res();
            }
          }, 150);
        });
      });

      const catProducts = await page.evaluate((catName) => {
        const items = [];
        // Extract all elements with links or images
        const allLinks = document.querySelectorAll('a[href*="product"], a[href*="refrigerators"], a[href*="air-conditioners"], a[href*="washing-machines"], a[href*="freezers"], a[href*="tvs"], .product, div[class*="product"]');
        
        allLinks.forEach(el => {
          const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
          const title = el.textContent.trim();
          const imgSrc = img ? (img.getAttribute('data-src') || img.getAttribute('src') || img.src) : '';
          
          if (title.length > 3 && imgSrc && !imgSrc.includes('logo') && !imgSrc.includes('icon')) {
            items.push({
              category: catName,
              title: title.replace(/\s+/g, ' '),
              imgSrc: imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc
            });
          }
        });
        return items;
      }, cat.name);

      console.log(`   Scraped ${catProducts.length} items from ${cat.name}`);
      allHaierOfficialCatalog.push(...catProducts);

    } catch (e) {
      console.error(`   Could not load ${cat.url}: ${e.message}`);
    }
  }

  await browser.close();

  // Deduplicate
  const uniqueHaier = [];
  const seen = new Set();
  allHaierOfficialCatalog.forEach(item => {
    const k = `${item.title.toLowerCase()}_${item.imgSrc}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniqueHaier.push(item);
    }
  });

  console.log(`\n✅ Total Haier Official Catalog Items Extracted: ${uniqueHaier.length}`);
  fs.writeFileSync(path.join(__dirname, 'haier_official_catalog.json'), JSON.stringify(uniqueHaier, null, 2), 'utf8');

  console.log("==================================================\n");
}

scrapeHaierOfficialDeep().catch(console.error);
