const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;
const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

async function render5Logos() {
  console.log("==================================================");
  console.log("🎨 RENDERING 5 HIGH-END DESIGN.COM STYLE LOGOS (NO LEAF)");
  console.log("==================================================");

  // Logo 1: 3D Blue/Green Earth Globe + 3D Gold Orbit Ring
  const svg1 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="e3d1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="40%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0369A1"/>
        </radialGradient>
        <linearGradient id="g3d1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FEF08A"/>
          <stop offset="50%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#B45309"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <g>
        <circle cx="180" cy="200" r="105" fill="url(#e3d1)"/>
        <path d="M 115 155 Q 150 115 200 145 Q 240 170 220 225 Q 185 270 130 240 Z" fill="#22C55E"/>
        <ellipse cx="180" cy="200" rx="140" ry="40" fill="none" stroke="url(#g3d1)" stroke-width="12" transform="rotate(-28 180 200)"/>
        <circle cx="312" cy="132" r="12" fill="#FDE047"/>
      </g>
      <text x="360" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="74" font-weight="900" fill="#0F172A" letter-spacing="-1.5">Earthy<tspan fill="#0284C7">Electronics</tspan></text>
      <text x="365" y="265" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#16A34A" letter-spacing="5">3D SMART HOME APPLIANCES</text>
    </svg>
  `);

  // Logo 2: Minimalist Tech Blue/Green Earth Badge + Circuit Sparks
  const svg2 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="b2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#16A34A"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <rect x="70" y="80" width="220" height="240" rx="44" fill="url(#b2)"/>
      <circle cx="180" cy="200" r="85" fill="#0369A1"/>
      <path d="M 130 180 Q 170 140 210 180 Q 230 220 180 250 Z" fill="#4ADE80"/>
      <polygon points="185,135 165,195 190,195 170,265 210,185 185,185" fill="#FDE047"/>
      <text x="340" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#0369A1" letter-spacing="-1.5">EARTHY <tspan fill="#16A34A">ELECTRONICS</tspan></text>
      <text x="345" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#64748B" letter-spacing="4.5">AUTHORIZED RETAIL STORE</text>
    </svg>
  `);

  // Logo 3: Executive Corporate Shield Logo
  const svg3 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <path d="M 180 80 Q 270 90 270 180 Q 270 290 180 330 Q 90 290 90 180 Q 90 90 180 80 Z" fill="#0F172A" stroke="#0284C7" stroke-width="8"/>
      <circle cx="180" cy="190" r="65" fill="#0284C7"/>
      <path d="M 140 180 Q 180 145 210 180 Q 220 210 180 230 Z" fill="#22C55E"/>
      <text x="330" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="74" font-weight="900" fill="#0F172A" letter-spacing="-1">Earthy<tspan fill="#16A34A">Electronics</tspan></text>
      <text x="335" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#0284C7" letter-spacing="5">EXECUTIVE STOREFRONT</text>
    </svg>
  `);

  // Logo 4: Clean Horizontal Banner + 3D Earth Sphere
  const svg4 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <circle cx="170" cy="200" r="100" fill="#0EA5E9"/>
      <path d="M 110 160 Q 150 120 195 155 Q 230 190 195 240 Q 145 270 115 210 Z" fill="#15803D"/>
      <circle cx="170" cy="200" r="45" fill="none" stroke="#FFFFFF" stroke-width="12"/>
      <line x1="170" y1="125" x2="170" y2="160" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
      <text x="330" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="900" fill="#0284C7" letter-spacing="-1">Earthy<tspan fill="#0F172A">Electronics</tspan></text>
      <text x="335" y="265" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#15803D" letter-spacing="5">HOME AND KITCHEN APPLIANCES</text>
    </svg>
  `);

  // Logo 5: Luxury Gold & Blue/Green Earth Emblem
  const svg5 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="#FFFFFF"/>
      <circle cx="180" cy="200" r="110" fill="#0284C7" stroke="#F59E0B" stroke-width="10"/>
      <path d="M 125 160 Q 165 125 210 155 Q 245 190 210 245 Z" fill="#16A34A"/>
      <circle cx="180" cy="200" r="80" fill="none" stroke="#FEF08A" stroke-width="4" stroke-dasharray="12 8"/>
      <text x="350" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="74" font-weight="900" fill="#0F172A" letter-spacing="-1.5">Earthy<tspan fill="#D97706">Electronics</tspan></text>
      <text x="355" y="265" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#0284C7" letter-spacing="5">LUXURY APPLIANCES STORE</text>
    </svg>
  `);

  await sharp(svg1).png().toFile(path.join(brainDir, 'design_com_logo_1.png'));
  await sharp(svg2).png().toFile(path.join(brainDir, 'design_com_logo_2.png'));
  await sharp(svg3).png().toFile(path.join(brainDir, 'design_com_logo_3.png'));
  await sharp(svg4).png().toFile(path.join(brainDir, 'design_com_logo_4.png'));
  await sharp(svg5).png().toFile(path.join(brainDir, 'design_com_logo_5.png'));

  await sharp(svg1).png().toFile(path.join(publicImagesDir, 'earthyelectronics_logo.png'));

  console.log("✅ Rendered 5 High-End Design.com style logo options!");
}

render5Logos().catch(console.error);
