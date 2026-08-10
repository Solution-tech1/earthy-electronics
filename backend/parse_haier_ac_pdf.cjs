const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function parseAcPdf() {
  console.log("==================================================");
  console.log("📄 PARSING HAIER AIR CONDITIONERS FROM HAIER_JUNE-26_MRP.pdf");
  console.log("==================================================");

  const pdfPath = path.join(__dirname, 'product files', 'HAIER_JUNE-26_MRP.pdf');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Total text lines extracted from PDF: ${lines.length}`);

  const acModels = [];
  let isAcSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('air conditioner') || line.toLowerCase().includes('hsu-') || line.toLowerCase().includes('hdu-') || line.toLowerCase().includes('split')) {
      isAcSection = true;
    }

    // Match Haier AC model patterns (HSU-, HDU-, HBA-, HFU-, HCA-)
    if (line.match(/H[SDBFC]U-\d+/i) || line.match(/HSU-/i) || line.match(/HDU-/i) || line.match(/HBA-/i)) {
      // Find price nearby
      let mrp = 0;
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        const pMatch = lines[j].replace(/,/g, '').match(/\b\d{5,7}\b/);
        if (pMatch) {
          mrp = parseInt(pMatch[0], 10);
          break;
        }
      }
      acModels.push({ model: line, mrp });
    }
  }

  // Deduplicate
  const cleanAc = [];
  const seen = new Set();
  acModels.forEach(m => {
    if (!seen.has(m.model.toUpperCase())) {
      seen.add(m.model.toUpperCase());
      cleanAc.push(m);
    }
  });

  console.log(`\nExtracted ${cleanAc.length} Haier Air Conditioner Models from PDF.`);
  fs.writeFileSync(path.join(__dirname, 'haier_ac_parsed.json'), JSON.stringify(cleanAc, null, 2), 'utf8');

  console.log("First 10 Extracted AC Models:");
  cleanAc.slice(0, 10).forEach((m, idx) => console.log(`   [${idx+1}] Model: "${m.model}" | MRP: ${m.mrp}`));
}

parseAcPdf().catch(console.error);
