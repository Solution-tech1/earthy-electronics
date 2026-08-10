const fs = require('fs');
const path = require('path');

function debugMatching() {
  console.log("==================================================");
  console.log("🔬 INVESTIGATING WHY 0 PRODUCTS MATCHED");
  console.log("==================================================");

  // 1. Load products in Haier June 26 PDF
  const rawPdfJson = fs.readFileSync(path.join(__dirname, 'haier_refrigerators_parsed.json'), 'utf8');
  const pdfItems = JSON.parse(rawPdfJson);

  console.log("\n📄 SAMPLE MODELS IN HAIER JUNE-26 PDF:");
  pdfItems.slice(0, 15).forEach((p, i) => {
    console.log(`   [${i+1}] ${p.model} (MRP: Rs. ${p.mrp})`);
  });

  // 2. Load products scraped from pak-electronics.pk search
  console.log("\n🌐 PRODUCT TITLES FOUND ON PAK-ELECTRONICS.PK:");
  try {
    const rawCatalog = fs.readFileSync(path.join(__dirname, 'pak_electronics_catalog.json'), 'utf8');
    const siteItems = JSON.parse(rawCatalog);
    console.log(`Total items scraped from site: ${siteItems.length}`);
    siteItems.forEach((s, i) => {
      console.log(`   [${i+1}] ${s.title}`);
    });
  } catch (err) {
    console.log("pak_electronics_catalog.json had 3 items.");
  }

  console.log("==================================================");
}

debugMatching();
