const puppeteer = require('puppeteer');
const fs = require('fs');

async function dumpIshopAllText() {
  console.log("==================================================");
  console.log("🔍 DUMPING ALL TEXT FROM ISHOPPING.PK HAIER REFRIGERATOR CATEGORY");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.ishopping.pk/home-appliances/refrigerators/haier-refrigerators-price-in-pakistan.html', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));

  const pageText = await page.evaluate(() => {
    return document.body.innerText.split('\n').map(t => t.trim()).filter(t => t.length > 5);
  });

  console.log(`📌 Landed Category Page URL: ${page.url()}`);
  console.log(`Total Text Blocks on Screen: ${pageText.length}\n`);

  const sampleProducts = pageText.filter(t => (t.toLowerCase().includes('haier') || t.toLowerCase().includes('hrf') || t.toLowerCase().includes('refrigerator') || t.toLowerCase().includes('inverter') || t.toLowerCase().includes('cu.ft') || t.toLowerCase().includes('liters')) && !t.includes('Price') && !t.includes('Buy')).slice(0, 10);

  console.log(`Sample Product Titles Extracted (${sampleProducts.length}):`);
  sampleProducts.forEach((t, i) => console.log(`   [${i+1}] ${t}`));

  if (sampleProducts.length === 0) {
    console.log("\nFirst 10 raw text lines on page:");
    pageText.slice(0, 10).forEach((t, i) => console.log(`   [${i+1}] ${t}`));
  }

  await browser.close();

  const report = {
    landedUrl: page.url(),
    first10Products: sampleProducts.length > 0 ? sampleProducts : pageText.slice(0, 10)
  };

  fs.writeFileSync('ishopping_ref_inspection_report.json', JSON.stringify(report, null, 2), 'utf8');
}

dumpIshopAllText().catch(console.error);
