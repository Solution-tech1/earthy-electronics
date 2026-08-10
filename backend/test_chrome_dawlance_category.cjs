const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outFile = path.join(__dirname, 'chrome_wm_dump.html');

console.log("Launching Chrome to fetch https://www.dawlance.com.pk/washing-machines...");

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://www.dawlance.com.pk/washing-machines" --dump-dom`;
  const result = execSync(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 25000 });
  fs.writeFileSync(outFile, result);
  console.log(`Saved Category Dump (${result.length} bytes)`);

  const htmlStr = result.toString();
  const models = htmlStr.match(/DW-[0-9]{4}[A-Z\s0-9-]*/g) || [];
  const uniqueModels = Array.from(new Set(models));
  console.log("Extracted Washing Machine Model Numbers:", uniqueModels.slice(0, 10));
} catch (e) {
  console.error("Chrome Execution Error:", e.message);
}

process.exit(0);
