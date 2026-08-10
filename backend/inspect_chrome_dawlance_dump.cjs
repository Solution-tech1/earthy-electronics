const fs = require('fs');
const path = require('path');

const dumpFile = path.join(__dirname, 'chrome_dump.html');
if (fs.existsSync(dumpFile)) {
  const content = fs.readFileSync(dumpFile, 'utf8');

  console.log("==================================================");
  console.log("🌐 REAL BROWSER DOM INSPECTION FOR www.dawlance.com.pk");
  console.log("==================================================");
  console.log(`DOM Size: ${content.length} bytes`);

  const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
  console.log(`1. Page Title: "${titleMatch ? titleMatch[1].trim() : 'N/A'}"`);

  const isCaptcha = content.toLowerCase().includes('cloudflare') || content.toLowerCase().includes('verify you are human') || content.toLowerCase().includes('access denied');
  console.log(`2. CAPTCHA / Access Denied Status: ${isCaptcha ? '⚠️ Blocked / CAPTCHA' : '✅ Normal Full Page Load'}`);

  // Find category links
  const links = [];
  const linkMatches = content.matchAll(/href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi);
  for (const m of linkMatches) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text.toLowerCase().includes('refrigerator') || text.toLowerCase().includes('washing') || href.includes('refrigerator') || href.includes('washing')) {
      links.push({ text, href });
    }
  }

  console.log("\n3. Category Links Found in Navigation:");
  links.slice(0, 10).forEach(l => console.log(`   - [${l.text}]: ${l.href}`));

  // Find product titles / model numbers
  const products = [];
  const prodMatches = content.matchAll(/class=["'][^"']*product[^"']*["'][^>]*>(.*?)<\/(?:div|h2|h3|a)>/gi);
  for (const p of prodMatches) {
    const text = p[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 5 && text.length < 100) products.push(text);
  }

  console.log("\n4. Sample Product Titles / Models Extracted:");
  if (products.length > 0) {
    products.slice(0, 5).forEach(p => console.log(`   - ${p}`));
  } else {
    // Extract any model patterns like DW-XXXX
    const models = content.match(/DW-[0-9]{4}[A-Z\s]*/g) || [];
    const uniqueModels = Array.from(new Set(models));
    console.log("   Extracted Model Numbers from Page:", uniqueModels.slice(0, 8));
  }

  console.log("==================================================\n");
}
