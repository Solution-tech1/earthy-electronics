const { execSync } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const searchUrl = 'https://www.haier.com/pk/search/?q=HWM-120%20AS%20MG';

console.log(`Executing Real Chrome Browser against ${searchUrl}...`);

try {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${searchUrl}" --dump-dom`;
  const result = execSync(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 20000 });
  const html = result.toString();

  console.log("Status: Page Loaded Successfully");
  console.log("Title:", (html.match(/<title>(.*?)<\/title>/i) || [])[1] || 'No Title');

  const productTitles = [];
  const matches = html.matchAll(/class=["'][^"']*product[^"']*["'][^>]*>(.*?)<\/(?:div|h2|h3|a|p)>/gi);
  for (const m of matches) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 5 && text.length < 80) productTitles.push(text);
  }

  // Also match any HWM models on the page
  const hwmModels = html.match(/HWM\s*[0-9]+[A-Z0-9-]*/gi) || [];
  const uniqueHwm = Array.from(new Set(hwmModels));

  console.log("Raw Product Titles Found:", productTitles.slice(0, 5));
  console.log("HWM Models Found on Haier Site:", uniqueHwm.slice(0, 10));
} catch (e) {
  console.error("Execution Error:", e.message);
}

process.exit(0);
