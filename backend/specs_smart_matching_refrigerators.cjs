const fs = require('fs');
const path = require('path');

function runSpecsSmartMatching() {
  console.log("==================================================");
  console.log("🧠 SPECS-BASED SMART MATCHING: PAK-ELECTRONICS (50 TITLES) vs PDF (57 MODELS)");
  console.log("==================================================");

  // Load PDF 57 Haier Refrigerator Models
  const pdf57Models = [
    { model: "HR-66 B", series: "Single Door", digits: "66" },
    { model: "HR-136 B", series: "Single Door", digits: "136" },
    { model: "HRF-186 EBS/EBD", series: "E Star Direct Cool", digits: "186" },
    { model: "HRF-216 EBS/EBD", series: "E Star Direct Cool", digits: "216" },
    { model: "HRF-216 EPR/EPB", series: "E Star Direct Cool", digits: "216" },
    { model: "HRF-246 EBS/EBD", series: "E Star Direct Cool", digits: "246" },
    { model: "HRF-246 EPR/EPB", series: "E Star Direct Cool", digits: "246" },
    { model: "HRF-276 EBS/EBD", series: "E Star Direct Cool", digits: "276" },
    { model: "HRF-276 EPR/EPB", series: "E Star Direct Cool", digits: "276" },
    { model: "HRF-316 EBS/EBD", series: "E Star Direct Cool", digits: "316" },
    { model: "HRF-316 EPR/EPB", series: "E Star Direct Cool", digits: "316" },
    { model: "HRF-346 EBS/EBD", series: "E Star Direct Cool", digits: "346" },
    { model: "HRF-346 EPR/EPB", series: "E Star Direct Cool", digits: "346" },
    { model: "HRF-368 EBS/EBD", series: "E Star Direct Cool", digits: "368" },
    { model: "HRF-368 EPR/EPB", series: "E Star Direct Cool", digits: "368" },
    { model: "HRF-398 EBS/EBD", series: "E Star Direct Cool", digits: "398" },
    { model: "HRF-398 EPR/EPB", series: "E Star Direct Cool", digits: "398" },
    { model: "HRF-438 EBS/EBD", series: "E Star Direct Cool", digits: "438" },
    { model: "HRF-438 EPR/EPB", series: "E Star Direct Cool", digits: "438" },
    { model: "HRF-538 EPR/EPG", series: "E Star Direct Cool", digits: "538" },
    { model: "HRF-246 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "246" },
    { model: "HRF-276 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "276" },
    { model: "HRF-316 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "316" },
    { model: "HRF-346 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "346" },
    { model: "HRF-538 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "538" },
    { model: "HRF-316 IDGA/IDRGA", series: "Digital Inverter Direct Cool", digits: "316" },
    { model: "HRF-346 IDGA/IDRGA", series: "Digital Inverter Direct Cool", digits: "346" },
    { model: "HRF-538 IDGA/IDRGA", series: "Digital Inverter Direct Cool", digits: "538" },
    { model: "HRF-368 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "368" },
    { model: "HRF-398 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "398" },
    { model: "HRF-438 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "438" },
    { model: "HRF-538 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "538" },
    { model: "HRF-368 IFGA/IFRA", series: "No Frost Inverter", digits: "368" },
    { model: "HRF-398 IFGA/IFRA", series: "No Frost Inverter", digits: "398" },
    { model: "HRF-438 IFGA/IFRA/IFPA", series: "No Frost Inverter", digits: "438" },
    { model: "HRF-538 IFGA/IFRA/IFPA", series: "No Frost Inverter", digits: "538" },
    { model: "HRF-418 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "418" },
    { model: "HRF-458 IPRA/IPGA/IPPA", series: "Smart Inverter Direct Cool", digits: "458" },
    { model: "HRF-418 IDGA/IDRGA", series: "Digital Inverter Direct Cool", digits: "418" },
    { model: "HRF-458 IDGA/IDRGA", series: "Digital Inverter Direct Cool", digits: "458" },
    { model: "HRF-418 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "418" },
    { model: "HRF-458 IAPA+/IARA", series: "E-Smart Inverter Direct Cool", digits: "458" },
    { model: "HRF-418 IFGA/IFRA/IFPA", series: "No Frost Inverter", digits: "418" },
    { model: "HRF-458 IFGA/IFRA/IFPA", series: "No Frost Inverter", digits: "458" },
    { model: "HRF-418 TIFG1U1/TIFB1U1 (IOT)", series: "Turbo/IOT Inverter", digits: "418" },
    { model: "HRF-458 TIFG1U1/TIFB1U1 (IOT)", series: "Turbo/IOT Inverter", digits: "458" },
    { model: "HRF-538 TIFG1U1/TIFB1U1 (IOT)", series: "Turbo/IOT Inverter", digits: "538" },
    { model: "HRF-488 IFFB", series: "Multi Door No Frost", digits: "488" },
    { model: "HRF-518 IFFB", series: "Multi Door No Frost", digits: "518" },
    { model: "HRF-518 WIFFBGU1", series: "Multi Door IOT No Frost", digits: "518" },
    { model: "HRF-622 IBS", series: "Side-by-Side Inverter", digits: "622" },
    { model: "HRF-622 ICG", series: "Side-by-Side Inverter", digits: "622" },
    { model: "HRF-622 IBG", series: "Side-by-Side Inverter", digits: "622" },
    { model: "HRF-578 TSG", series: "Side-by-Side Inverter", digits: "578" },
    { model: "HRF-578 TBG", series: "Side-by-Side Inverter", digits: "578" },
    { model: "HRF-578 TBGU1 (IOT)", series: "Side-by-Side IOT", digits: "578" },
    { model: "HRF-678 TGG", series: "Glass Door Side-by-Side", digits: "678" }
  ];

  // Scraped 50 Haier Refrigerator Titles from pak-electronics.pk
  const webTitles = [
    "Haier Digital Inverter Refrigerator HRF-316 IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-316 IFGA/IFRA",
    "Haier Digital Inverter Refrigerator HRF-346 IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-346 IFGA/IFRA",
    "Haier Digital Inverter Refrigerator HRF-368 IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-368 IFGA/IFRA",
    "Haier Digital Inverter Refrigerator HRF-398 IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-398 IFGA/IFRA",
    "Haier Digital Inverter Refrigerator HRF-438 IFGA/IFRA",
    "Haier Digital Inverter Refrigerator HRF-438IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-538 IDB/IDR",
    "Haier Digital Inverter Refrigerator HRF-538 IFGA/IFRA",
    "HAIER Glass Door Refrigerator 8 Cft HRF-216 /EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-246 /EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-276 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-316 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-346 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-368 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-398 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-438 EPB/EPR",
    "HAIER Glass Door Refrigerator 8 Cft HRF-538 EPG/EPR",
    "Haier Inverter Refrigerator HRF-578TGGU1",
    "HAIER Refrigerator (Inverter + Glass Door) HRF-678 TGG",
    "Haier Refrigerator HRF-246 EPG/EPR",
    "Haier Refrigerator HRF-276 EPG/EPR",
    "Haier Refrigerator HRF-316 IAPA+/IARA+",
    "Haier Refrigerator HRF-346 IAPA+/IARA+",
    "Haier Refrigerator HRF-368 IAPA/IARA",
    "Haier Refrigerator HRF-398 IAPA/IARA",
    "Haier Refrigerator HRF-438 IAPA/IARA",
    "Haier Refrigerator HRF-538 IAPA/IARA",
    "Haier Side By Side Refrigerator HRF-578 TBG",
    "Haier Side By Side Refrigerator HRF-578 TBP",
    "Haier Side-By-Side Inverter Refrigerator HRF-622 IBG",
    "Haier Side-By-Side Inverter Refrigerator HRF-622 IBS 550 Ltr",
    "Haier Side-By-Side Inverter Refrigerator HRF-622 ICG",
    "Haier Smart Inverter Refrigerator HRF-246 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-276 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-316 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-346 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-418 IFGA/IFRA/IFPA",
    "Haier Smart Inverter Refrigerator HRF-418 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-458 IFGA/IFRA/IFPA",
    "Haier Smart Inverter Refrigerator HRF-458 IPRA/IPGA",
    "Haier Smart Inverter Refrigerator HRF-538 IPRA/IPGA",
    "Haier Twin Inverter Refrigerator HRF-418TIFBU IOT",
    "Haier Twin Inverter Refrigerator HRF-458TIFGU IOT",
    "Haier Twin Inverter Refrigerator HRF-538 IOT",
    "Haier Refrigerator HRF-66 B Single Door",
    "Haier Refrigerator HRF-136 B Single Door"
  ];

  const results = [];

  for (const wTitle of webTitles) {
    const digitsMatch = wTitle.match(/\d{3}/);
    const wDigits = digitsMatch ? digitsMatch[0] : null;

    let bestMatch = null;
    let confidence = "Low";
    let reasoning = "No matching core model number found in PDF list.";

    if (wDigits) {
      // Find PDF candidates sharing exact core digits (e.g. "368")
      const candidates = pdf57Models.filter(m => m.digits === wDigits);

      if (candidates.length > 0) {
        // Evaluate specs match
        const titleLow = wTitle.toLowerCase();

        // 1. Check Exact Suffix Match (e.g. IFGA, IPRA, IAPA, EPB, IDB, TGG, IBS, ICG)
        const exactSuffixMatch = candidates.find(c => {
          const parts = c.model.replace(/^HRF-\d{3}\s*/i, '').toLowerCase().split(/[\/\s]+/);
          return parts.some(p => p.length >= 2 && titleLow.includes(p));
        });

        if (exactSuffixMatch) {
          bestMatch = exactSuffixMatch;
          confidence = "High";
          reasoning = `Core Model '${wDigits}' + Exact Suffix '${bestMatch.model}' matched perfectly!`;
        } else {
          // 2. Specs/Series Match (e.g. Digital Inverter, Smart Inverter, E-Smart, Side-by-Side)
          const seriesMatch = candidates.find(c => {
            const seriesLow = c.series.toLowerCase();
            return (titleLow.includes('digital') && seriesLow.includes('digital')) ||
                   (titleLow.includes('smart') && seriesLow.includes('smart')) ||
                   (titleLow.includes('side by side') && seriesLow.includes('side-by-side')) ||
                   (titleLow.includes('glass door') && (seriesLow.includes('direct cool') || seriesLow.includes('glass')));
          });

          if (seriesMatch) {
            bestMatch = seriesMatch;
            confidence = "High";
            reasoning = `Core Model '${wDigits}' + Specs Type (${bestMatch.series}) matched!`;
          } else {
            // Core digits match fallback
            bestMatch = candidates[0];
            confidence = "Medium";
            reasoning = `Core Model '${wDigits}' matches list model '${bestMatch.model}'. Minor variant suffix difference.`;
          }
        }
      }
    }

    results.push({
      webTitle: wTitle,
      matchedModel: bestMatch ? bestMatch.model : "UNMATCHED",
      confidence: confidence,
      reasoning: reasoning
    });
  }

  // Generate Markdown Table
  console.log("\n==================================================");
  console.log("📊 SPECS-BASED SMART MATCHING SUMMARY REPORT");
  console.log("==================================================");
  const highCount = results.filter(r => r.confidence === 'High').length;
  const medCount = results.filter(r => r.confidence === 'Medium').length;
  const lowCount = results.filter(r => r.confidence === 'Low').length;

  console.log(`✅ High Confidence Matches: ${highCount}`);
  console.log(`🟡 Medium Confidence Matches: ${medCount}`);
  console.log(`❌ Unmatched / Low Confidence: ${lowCount}`);
  console.log("==================================================\n");

  // Save JSON report
  fs.writeFileSync(path.join(__dirname, 'specs_smart_matching_report.json'), JSON.stringify(results, null, 2), 'utf8');

  process.exit(0);
}

runSpecsSmartMatching();
