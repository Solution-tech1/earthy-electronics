const fs = require('fs');
const path = require('path');

function generateMasterReport() {
  console.log("==================================================");
  console.log("📊 GENERATING MASTER GOOGLE IMAGE SUB-AGENT REPORT");
  console.log("==================================================");

  const reportFiles = [
    'Google_Image_SubAgent_Report_Chunk1.csv',
    'Google_Image_SubAgent_Report_Chunk2.csv',
    'Google_Image_SubAgent_Report_Chunk3.csv',
    'Google_Image_SubAgent_Report_Chunk4.csv'
  ];

  const masterPath = path.join(__dirname, 'product files', 'Google_Image_SubAgent_Report.csv');
  let masterCsv = "S_No,Product_Model,Category,Source_Page_URL,Image_Status,Match_Notes\n";

  let totalCount = 0;
  let totalUploaded = 0;
  let totalUnmatched = 0;

  reportFiles.forEach((rf, cIdx) => {
    const fPath = path.join(__dirname, 'product files', rf);
    if (fs.existsSync(fPath)) {
      const lines = fs.readFileSync(fPath, 'utf8').split('\n');
      for (let idx = 1; idx < lines.length; idx++) {
        const line = lines[idx].trim();
        if (!line) continue;
        totalCount++;
        if (line.includes('GOOGLE_VERIFIED_UPLOADED')) totalUploaded++;
        else totalUnmatched++;

        masterCsv += `"${totalCount}",${line}\n`;
      }
    }
  });

  fs.writeFileSync(masterPath, masterCsv, 'utf8');

  console.log("\n==================================================");
  console.log("📊 MASTER GOOGLE IMAGE SUB-AGENT FINAL SUMMARY");
  console.log("==================================================");
  console.log(`TOTAL UNMATCHED MODELS AUDITED: ${totalCount}`);
  console.log(`✅ GOOGLE_VERIFIED_UPLOADED: ${totalUploaded}`);
  console.log(`❌ UNMATCHED_VIA_GOOGLE: ${totalUnmatched}`);
  console.log(`📄 MASTER CSV REPORT SAVED: ${masterPath}`);
  console.log("==================================================\n");
}

generateMasterReport();
