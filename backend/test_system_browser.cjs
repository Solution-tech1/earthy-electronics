const fs = require('fs');
const { execSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log("Edge exists:", fs.existsSync(edgePath));
console.log("Chrome exists:", fs.existsSync(chromePath));

if (fs.existsSync(edgePath) || fs.existsSync(chromePath)) {
  const bPath = fs.existsSync(chromePath) ? chromePath : edgePath;
  console.log("Using browser binary at:", bPath);

  try {
    const output = execSync(`"${bPath}" --headless --dump-dom --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://www.dawlance.com.pk"`, { timeout: 15000 }).toString();
    console.log("Browser Dump Output Length:", output.length);
    console.log("Title snippet:", (output.match(/<title>(.*?)<\/title>/i) || [])[1] || 'No Title');
  } catch (e) {
    console.error("Browser exec error:", e.message);
  }
}
