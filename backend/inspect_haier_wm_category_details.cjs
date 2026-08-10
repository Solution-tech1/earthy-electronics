const { execSync } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const catUrl = 'https://www.haier.com/pk/washing-machines';

console.log(`Fetching Haier Washing Machines Category Page: ${catUrl}...`);

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${catUrl}" --dump-dom`;
  const result = execSync(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 25000 });
  const html = result.toString();

  console.log("DOM Size:", html.length);

  // Extract product titles / headings from category page
  const titles = [];
  const matches = html.matchAll(/<(?:h2|h3|h4|a|p|span)[^>]*class=["'][^"']*(?:product|title|name)[^"']*["'][^>]*>(.*?)<\/(?:h2|h3|h4|a|p|span)>/gi);
  for (const m of matches) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 5 && text.length < 120 && !titles.includes(text)) {
      titles.push(text);
    }
  }

  // Also extract model names like HWM / HW
  const hwmMatches = html.match(/(?:HWM|HW)[0-9\s-]*[A-Z0-9-]*/gi) || [];
  const uniqueHwm = Array.from(new Set(hwmMatches.map(m => m.trim())));

  console.log("==================================================");
  console.log("📊 HAIER CATEGORY PAGE DETAILED METRICS");
  console.log("==================================================");
  console.log(`1. Exact Category URL: ${catUrl}`);
  console.log(`2. Total On-Page Model Identifiers Extracted: ${uniqueHwm.length}`);
  console.log("\n3. Exact Product Title Examples from Haier Category Page:");
  uniqueHwm.slice(0, 10).forEach((t, i) => console.log(`   [Example ${i + 1}] ${t}`));
  console.log("==================================================\n");
} catch (e) {
  console.error("Execution Error:", e.message);
}

process.exit(0);
