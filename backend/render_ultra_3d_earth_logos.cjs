const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5`;
const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

async function render3DEarthLogos() {
  console.log("==================================================");
  console.log("🎨 RENDERING ULTRA 3D GLOSSY EARTH GLOBE LOGOS (NO LEAF)");
  console.log("==================================================");

  // 3D Logo 1: Glossy 3D Earth Sphere + 3D Gold Orbit Ring + 3D Metallic Text
  const svg1 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 3D Sphere Radial Gradient -->
        <radialGradient id="earth3d" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="40%" stop-color="#0284C7"/>
          <stop offset="85%" stop-color="#0369A1"/>
          <stop offset="100%" stop-color="#0c4a6e"/>
        </radialGradient>
        
        <!-- 3D Continent Gradient -->
        <linearGradient id="land3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ADE80"/>
          <stop offset="50%" stop-color="#16A34A"/>
          <stop offset="100%" stop-color="#14532D"/>
        </linearGradient>

        <!-- 3D Gold Metallic Ring Gradient -->
        <linearGradient id="gold3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FEF08A"/>
          <stop offset="30%" stop-color="#F59E0B"/>
          <stop offset="70%" stop-color="#B45309"/>
          <stop offset="100%" stop-color="#78350F"/>
        </linearGradient>

        <!-- Shadow Filter -->
        <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0284C7" flood-opacity="0.35"/>
        </filter>
        
        <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#F59E0B" flood-opacity="0.5"/>
        </filter>
      </defs>

      <rect width="1200" height="400" fill="#FFFFFF"/>

      <!-- 3D Earth Group -->
      <g filter="url(#shadow3d)">
        <!-- Base 3D Sphere -->
        <circle cx="200" cy="200" r="115" fill="url(#earth3d)"/>
        
        <!-- 3D Continents -->
        <path d="M 130 150 Q 165 110 215 140 Q 255 165 235 220 Q 200 270 145 240 Z" fill="url(#land3d)" opacity="0.95"/>
        <path d="M 235 210 Q 285 190 300 240 Q 265 290 220 275 Z" fill="url(#land3d)" opacity="0.9"/>

        <!-- Glossy Highlight Overlay -->
        <path d="M 115 170 A 115 115 0 0 1 285 115 A 115 80 0 0 0 115 170 Z" fill="#FFFFFF" opacity="0.25"/>

        <!-- Back Half of 3D Gold Orbit Ring -->
        <path d="M 70 200 A 150 45 0 0 1 330 200" fill="none" stroke="url(#gold3d)" stroke-width="12" stroke-dasharray="16 6" transform="rotate(-28 200 200)"/>

        <!-- Front Half of 3D Gold Orbit Ring -->
        <path d="M 330 200 A 150 45 0 0 1 70 200" fill="none" stroke="url(#gold3d)" stroke-width="14" transform="rotate(-28 200 200)" filter="url(#glowGold)"/>
        <circle cx="342" cy="132" r="14" fill="#FDE047" filter="url(#glowGold)"/>
      </g>

      <!-- 3D Typography -->
      <text x="390" y="215" font-family="'Inter', 'Segoe UI', sans-serif" font-size="76" font-weight="900" fill="#0F172A" letter-spacing="-2">Earthy<tspan fill="#0284C7">Electronics</tspan></text>
      <text x="395" y="265" font-family="'Inter', 'Segoe UI', sans-serif" font-size="22" font-weight="800" fill="#16A34A" letter-spacing="6">3D ECO SMART APPLIANCES</text>
    </svg>
  `);

  // 3D Logo 2: Glowing 3D Glassy Earth Core + Metallic Power Arc (No Leaf)
  const svg2 = Buffer.from(`
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glassEarth" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="50%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </radialGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#4ADE80" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#16A34A" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <rect width="1200" height="400" fill="#FFFFFF"/>

      <g>
        <circle cx="200" cy="200" r="110" fill="url(#glassEarth)"/>
        <circle cx="200" cy="200" r="90" fill="url(#coreGlow)"/>
        
        <!-- 3D Power Arc -->
        <circle cx="200" cy="200" r="60" fill="none" stroke="#38BDF8" stroke-width="12" stroke-dasharray="240 60" transform="rotate(-45 200 200)"/>
        <line x1="200" y1="120" x2="200" y2="160" stroke="#38BDF8" stroke-width="12" stroke-linecap="round"/>

        <!-- Glossy Highlight -->
        <ellipse cx="160" cy="140" rx="40" ry="25" fill="#FFFFFF" opacity="0.35" transform="rotate(-20 160 140)"/>
      </g>

      <text x="380" y="215" font-family="'Segoe UI', sans-serif" font-size="74" font-weight="900" fill="#0369A1" letter-spacing="-1.5">Earthy<tspan fill="#15803D">Electronics</tspan></text>
      <text x="385" y="265" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800" fill="#64748B" letter-spacing="5">NEXT-GEN HOME APPLIANCES</text>
    </svg>
  `);

  await sharp(svg1).png().toFile(path.join(brainDir, 'ultra_3d_earth_logo1.png'));
  await sharp(svg2).png().toFile(path.join(brainDir, 'ultra_3d_earth_logo2.png'));

  // Also update website logo directly
  await sharp(svg1).png().toFile(path.join(publicImagesDir, 'earthyelectronics_logo.png'));

  console.log("✅ Rendered Ultra 3D Earth Logos and applied 3D Logo 1 to website!");
}

render3DEarthLogos().catch(console.error);
