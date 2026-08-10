const { execSync } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outFile = 'chrome_dump.html';

console.log("Launching Chrome to fetch www.dawlance.com.pk...");

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://www.dawlance.com.pk" --dump-dom`;
  const result = execSync(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 20000 });
  fs.writeFileSync(outFile, result);
  console.log(`Saved Chrome Dump to ${outFile} (${result.length} bytes)`);

  const htmlStr = result.toString();
  const title = (htmlStr.match(/<title>(.*?)<\/title>/i) || [])[1] || 'No Title';
  console.log("Extracted Page Title:", title);
} catch (e) {
  console.error("Chrome Execution Error:", e.message);
}

process.exit(0);
