const fs = require('fs');
const path = require('path');

function generateUnmatchedSummary() {
  console.log("==================================================");
  console.log("📊 HAIER JUNE-26 PDF SUMMARY & UNMATCHED COUNT BREAKDOWN");
  console.log("==================================================");

  const refReportPath = path.join(__dirname, 'pak_ref_chunk2_report.json');
  const acReportPath = path.join(__dirname, 'pak_ac_chunk1_report.json');

  let refMatched = 0;
  let refUnmatched = 0;

  if (fs.existsSync(refReportPath)) {
    const data = JSON.parse(fs.readFileSync(refReportPath, 'utf8'));
    refUnmatched = data.filter(r => r.image_status === 'NOT_FOUND').length;
    refMatched = 57 - refUnmatched;
  }

  let acMatched = 0;
  let acUnmatched = 0;

  if (fs.existsSync(acReportPath)) {
    const data = JSON.parse(fs.readFileSync(acReportPath, 'utf8'));
    acUnmatched = data.filter(r => r.image_status === 'NOT_FOUND').length;
    acMatched = data.length - acUnmatched;
  }

  const totalPdfModels = 124;
  const totalMatched = refMatched + acMatched;
  const totalUnmatched = totalPdfModels - totalMatched;

  console.log(`1. Category 1: Refrigerators (57 Models Total)`);
  console.log(`   - Matched & Live: ${refMatched}`);
  console.log(`   - Still Unmatched: ${refUnmatched}\n`);

  console.log(`2. Category 2: Air Conditioners (43 Models Total)`);
  console.log(`   - Matched & Live: ${acMatched}`);
  console.log(`   - Still Unmatched: ${acUnmatched}\n`);

  console.log(`3. Category 3: Washing Machines (16 Models Total)`);
  console.log(`   - Still Unmatched: 16\n`);

  console.log(`4. Category 4: Dispensers & Microwaves (8 Models Total)`);
  console.log(`   - Still Unmatched: 8\n`);

  console.log("==================================================");
  console.log(`📊 TOTAL OVERALL HAIER PDF MODELS: ${totalPdfModels}`);
  console.log(`✅ TOTAL MATCHED & LIVE: ${totalMatched}`);
  console.log(`❌ TOTAL STILL UNMATCHED: ${totalUnmatched}`);
  console.log("==================================================\n");
}

generateUnmatchedSummary();
