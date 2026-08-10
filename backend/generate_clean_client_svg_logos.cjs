const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;

async function createClientLogos() {
  console.log("==================================================");
  console.log("🎨 GENERATING HIGH-RES VECTOR LOGO OPTIONS (NO LEAF)");
  console.log("==================================================");

  // Option 1: Blue & Green Earth Globe + Golden Electrical Ring (No Leaf)
  const svg1 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <!-- Earth Globe -->
      <circle cx="180" cy="200" r="110" fill="#0284C7"/>
      <!-- Continents -->
      <path d="M 120 160 Q 150 130 190 150 Q 230 170 210 220 Q 180 260 140 240 Z" fill="#16A34A"/>
      <path d="M 220 220 Q 260 200 280 240 Q 250 280 210 270 Z" fill="#15803D"/>
      <!-- Gold Electric Ring -->
      <ellipse cx="180" cy="200" rx="145" ry="45" fill="none" stroke="#F59E0B" stroke-width="10" transform="rotate(-25 180 200)"/>
      <circle cx="310" cy="140" r="14" fill="#F59E0B"/>
      <!-- Typography -->
      <text x="360" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="900" fill="#0F172A" letter-spacing="-1.5">Earthy<tspan fill="#0284C7">Electronics</tspan></text>
      <text x="365" y="265" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#059669" letter-spacing="4">PREMIUM HOME APPLIANCES</text>
    </svg>
  `);

  // Option 2: Minimalist Blue & Green Earth Globe + Power Spark (No Leaf)
  const svg2 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <!-- Earth Globe -->
      <circle cx="180" cy="200" r="110" fill="#0EA5E9"/>
      <path d="M 115 170 Q 160 120 210 160 Q 250 200 210 250 Q 150 280 120 210 Z" fill="#22C55E"/>
      <circle cx="180" cy="200" r="45" fill="none" stroke="#FFFFFF" stroke-width="12"/>
      <path d="M 180 135 L 180 175" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
      <!-- Typography -->
      <text x="350" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="900" fill="#0369A1" letter-spacing="-1">Earthy<tspan fill="#15803D">Electronics</tspan></text>
      <text x="355" y="265" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#64748B" letter-spacing="5">AUTHORIZED ELECTRONICS STORE</text>
    </svg>
  `);

  // Option 3: Modern Corporate Blue/Green Earth Badge (No Leaf)
  const svg3 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <rect x="70" y="80" width="220" height="240" rx="40" fill="linear-gradient(135deg, #0284c7, #16a34a)"/>
      <circle cx="180" cy="200" r="85" fill="#0369A1"/>
      <path d="M 130 180 Q 170 140 210 180 Q 230 220 180 250 Z" fill="#22C55E"/>
      <!-- Lightning Bolt -->
      <polygon points="185,140 165,200 190,200 170,260 210,190 185,190" fill="#FBBF24"/>
      <!-- Typography -->
      <text x="340" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="74" font-weight="900" fill="#0F172A" letter-spacing="-1.5">EARTHY <tspan fill="#0284C7">ELECTRONICS</tspan></text>
      <text x="345" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#16A34A" letter-spacing="4.5">ECO-FRIENDLY HOME STORE</text>
    </svg>
  `);

  await sharp(svg1).png().toFile(path.join(brainDir, 'client_earth_logo1.png'));
  await sharp(svg2).png().toFile(path.join(brainDir, 'client_earth_logo2.png'));
  await sharp(svg3).png().toFile(path.join(brainDir, 'client_earth_logo3.png'));

  console.log("✅ Successfully generated 3 clean client-ready logo variations!");
}

createClientLogos().catch(console.error);
