const fs = require('fs');

const report = JSON.parse(fs.readFileSync('pak_ref_final_report.json', 'utf8'));
const matched = report.filter(r => r.image_status === 'FOUND_AND_UPLOADED');

console.log("==================================================");
console.log(`✅ TOTAL MATCHED REFRIGERATOR MODELS: ${matched.length}`);
console.log("==================================================");

matched.forEach((m, i) => {
  console.log(`[${i+1}] Model: ${m.model} | Site: ${m.source_website} | Notes: ${m.match_notes}`);
});
