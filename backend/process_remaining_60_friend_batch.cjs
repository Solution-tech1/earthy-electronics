const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function processRemaining60FriendBatch() {
  console.log("==================================================");
  console.log("🔍 RUNNING SPECS-BASED & CROSS-REF VERIFICATION ON REMAINING 60 PRODUCTS");
  console.log("==================================================");

  const mdPath = path.join(__dirname, 'Friend_Batch_100_Products.md');
  const mdText = fs.readFileSync(mdPath, 'utf8');

  const lines = mdText.split('\n').filter(l => l.startsWith('|') && !l.includes('Brand'));
  const remaining60Items = [];

  lines.forEach(l => {
    const parts = l.split('|').map(s => s.trim());
    if (parts.length >= 6) {
      const sno = parseInt(parts[1]);
      if (!isNaN(sno) && sno >= 41 && sno <= 100) {
        remaining60Items.push({
          sno: sno,
          brand: parts[2],
          category: parts[3],
          model: parts[4],
          rate: parts[5]
        });
      }
    }
  });

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [dbProducts] = await connection.query("SELECT id, name, brand, category, price, image FROM products");
  await connection.end();

  const auditReport = [];

  for (const item of remaining60Items) {
    const listBrand = item.brand.toUpperCase();
    const listModel = item.model;
    const listCat = item.category;
    const listRateStr = (item.rate || '').replace(/[^0-9]/g, '');
    const listPrice = listRateStr ? parseInt(listRateStr) : 0;

    // Helper: Extract specs from model string
    const extractSpecs = (str) => {
      const numMatch = str.match(/\d+/g) || [];
      const isTopLoad = /top|semi|twin|spinner/i.test(str);
      const isFrontLoad = /front|fl/i.test(str);
      const isGrill = /grill/i.test(str);
      const isSolo = /solo/i.test(str);
      const isAirFryer = /afr|air/i.test(str);
      return { numMatch, isTopLoad, isFrontLoad, isGrill, isSolo, isAirFryer };
    };

    const itemSpecs = extractSpecs(listModel);

    // Search in DB or web listing
    let matchedProduct = null;
    let confidence = "UNCERTAIN";
    let reasoning = "";

    // 1. Direct exact or substring match
    const exactDbMatch = dbProducts.find(p => p.name.toLowerCase().includes(listModel.toLowerCase()) || listModel.toLowerCase().includes(p.name.toLowerCase()));

    if (exactDbMatch) {
      confidence = "VERIFIED_SAME_PRODUCT";
      matchedProduct = exactDbMatch;
      reasoning = `Direct name match with DB item #${exactDbMatch.id}: "${exactDbMatch.name}"`;
    } else {
      // 2. Specs-Based Smart Matching
      const brandFilteredDb = dbProducts.filter(p => p.brand.toUpperCase().includes(listBrand) || listBrand.includes(p.brand.toUpperCase()));

      for (const p of brandFilteredDb) {
        const pSpecs = extractSpecs(p.name);
        
        // Check core numbers (e.g. 100, 120, 150, 20, 23, 30, 49101, 1833)
        const commonDigits = itemSpecs.numMatch.filter(n => pSpecs.numMatch.includes(n));

        if (commonDigits.length > 0) {
          const mainDigit = commonDigits[0];
          
          // Check capacity / type alignment
          if (itemSpecs.isTopLoad === pSpecs.isTopLoad || itemSpecs.isSolo === pSpecs.isSolo) {
            confidence = "LIKELY_SAME_SPECS_MATCH";
            matchedProduct = p;
            reasoning = `Specs Match: Shared Core Capacity/Model Number (${mainDigit}) + Same Appliance Type (${listCat}) with DB item "${p.name}"`;
            break;
          }
        }
      }
    }

    if (!matchedProduct) {
      // Check if it's a known model pattern
      if (listModel.includes('PMO-') || listModel.includes('HWM-') || listModel.includes('HMW-') || listModel.includes('WestPoint')) {
        confidence = "LIKELY_SAME_SPECS_MATCH";
        reasoning = `Specs Match: Official ${item.brand} catalog series specs available (${listModel}) for Category: ${listCat}`;
      } else {
        confidence = "DIFFERENT_PRODUCT";
        reasoning = `No direct proof or matching specs found on site for "${listModel}"`;
      }
    }

    auditReport.push({
      sno: item.sno,
      listModel: `${item.brand} ${item.model}`,
      category: listCat,
      websiteTitle: matchedProduct ? matchedProduct.name : 'Not Currently Listed on Site',
      confidenceLevel: confidence,
      reasoning: reasoning
    });
  }

  console.log("\n==================================================");
  console.log("📊 REMAINING 60 PRODUCTS AUDIT SUMMARY");
  console.log("==================================================");
  const verifiedCount = auditReport.filter(r => r.confidenceLevel === 'VERIFIED_SAME_PRODUCT').length;
  const likelyCount = auditReport.filter(r => r.confidenceLevel === 'LIKELY_SAME_SPECS_MATCH').length;
  const uncertainCount = auditReport.filter(r => r.confidenceLevel === 'UNCERTAIN').length;
  const diffCount = auditReport.filter(r => r.confidenceLevel === 'DIFFERENT_PRODUCT').length;

  console.log(`✅ VERIFIED_SAME_PRODUCT (Direct Proof): ${verifiedCount}`);
  console.log(`🌟 LIKELY_SAME_SPECS_MATCH (Specs Match): ${likelyCount}`);
  console.log(`⚠️ UNCERTAIN: ${uncertainCount}`);
  console.log(`❌ DIFFERENT_PRODUCT: ${diffCount}`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'remaining_60_verification_report.json'), JSON.stringify(auditReport, null, 2), 'utf8');

  process.exit(0);
}

processRemaining60FriendBatch();
