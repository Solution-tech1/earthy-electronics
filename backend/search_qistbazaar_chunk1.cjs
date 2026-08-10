const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CHUNK1_UNMATCHED_MODELS = [
  "10 LF", "12 CF", "12 FITH 3W", "12 FITH 6C/S", "12 PITH 11S", "12 PITH 11W",
  "12 T3 PRO", "12G Frost Everest", "12e Cool", "13 HFAB Grey", "13 LF", "14 HFT W",
  "15 Elegance X", "15 Enercon", "15 Inspire", "15 Mega Flex", "15 Mega T+",
  "15 Powercon", "15 Sprinter", "18 AITH", "18 FITH 1", "18 FITH 6C/S", "18 FITH 7",
  "18 HEF", "18 HFC", "18 HFP", "18 HFT S", "18 HFT W", "18 HJ", "18 HJ UV",
  "18 PITH 10W", "18 PITH 11S", "18 PITH 11W", "18 PITH 14S", "18 T3 PRO", "18 T3B",
  "18G Frost Everest", "18e Cool", "19 HFAB Grey", "19 HFAB White", "19 HFC", "19 HFP", "19 LF"
];

async function searchQistbazaarChunk1() {
  console.log("=== SEARCHING QISTBAZAAR.PK FOR 42 UNMATCHED CHUNK 1 AC MODELS ===");

  let matchedOnQist = 0;
  const qistMatches = [];

  for (const model of CHUNK1_UNMATCHED_MODELS) {
    try {
      const q = encodeURIComponent(model);
      const res = await fetch(`https://www.qistbazaar.pk/api/product/search?query=${q}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json.products || [];
        const exact = items.find(item => {
          const titleLow = (item.title || item.name || '').toLowerCase();
          return titleLow.includes(model.toLowerCase());
        });

        if (exact) {
          matchedOnQist++;
          const imgPath = exact.productImage || exact.image || '';
          const fullImg = imgPath.startsWith('http') ? imgPath : `https://www.qistbazaar.pk/${imgPath}`;
          qistMatches.push({ model, matchTitle: exact.title, img: fullImg });
        }
      }
    } catch (err) {
      // ignore network search error
    }
  }

  console.log(`\nResults from QistBazaar.pk Search:`);
  console.log(`• Total Unmatched Chunk 1 Models Tested: ${CHUNK1_UNMATCHED_MODELS.length}`);
  console.log(`• Exact Character Matches Found on QistBazaar: ${matchedOnQist}`);
  
  if (qistMatches.length > 0) {
    console.log(`\nExact Matches List:`);
    qistMatches.forEach(m => {
      console.log(`  - Model: "${m.model}" -> Title: "${m.matchTitle}" | Image: ${m.img}`);
    });
  } else {
    console.log(`  (0 exact character matches found on QistBazaar for these 42 abbreviated AC model codes)`);
  }

  process.exit(0);
}

searchQistbazaarChunk1().catch(console.error);
