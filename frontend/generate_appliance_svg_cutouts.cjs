const fs = require('fs');
const path = require('path');

const publicImgDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(publicImgDir)) {
  fs.mkdirSync(publicImgDir, { recursive: true });
}

// 1. WATER HEATER GEYSER SVG
const geyserSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="gBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="gTop" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="#f8fafc" rx="20"/>
  <!-- Geyser Body Cylinder -->
  <rect x="150" y="80" width="200" height="320" rx="30" fill="url(#gBody)" stroke="#cbd5e1" stroke-width="4"/>
  <!-- Top Cap -->
  <path d="M 150 110 Q 250 80 350 110 L 350 120 L 150 120 Z" fill="url(#gTop)"/>
  <!-- Digital Temperature Display -->
  <rect x="200" y="160" width="100" height="50" rx="8" fill="#0f172a"/>
  <text x="250" y="195" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#10b981" text-anchor="middle">55°C</text>
  <!-- Brand Label -->
  <text x="250" y="250" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#065f46" text-anchor="middle">ELECTRIC GEYSER</text>
  <text x="250" y="270" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Heavy Duty Water Heater</text>
  <!-- Pipe Outlets -->
  <rect x="200" y="400" width="20" height="35" rx="4" fill="#ef4444"/>
  <rect x="280" y="400" width="20" height="35" rx="4" fill="#3b82f6"/>
</svg>`;

// 2. ROOM RADIANT HEATER SVG
const heaterSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="hGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="#f8fafc" rx="20"/>
  <!-- Heater Outer Frame -->
  <rect x="100" y="100" width="300" height="280" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <!-- Heating Rod Grille -->
  <rect x="130" y="130" width="240" height="180" rx="10" fill="#0f172a"/>
  <!-- Glowing Heat Rods -->
  <rect x="150" y="160" width="200" height="16" rx="8" fill="url(#hGlow)"/>
  <rect x="150" y="210" width="200" height="16" rx="8" fill="url(#hGlow)"/>
  <rect x="150" y="260" width="200" height="16" rx="8" fill="url(#hGlow)"/>
  <!-- Control Knobs -->
  <circle cx="170" cy="345" r="14" fill="#475569"/>
  <circle cx="330" cy="345" r="14" fill="#475569"/>
  <text x="250" y="350" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#10b981" text-anchor="middle">ROOM HEATER</text>
  <!-- Feet -->
  <rect x="120" y="380" width="40" height="25" rx="6" fill="#0f172a"/>
  <rect x="340" y="380" width="40" height="25" rx="6" fill="#0f172a"/>
</svg>`;

// 3. ELECTRIC FAN SVG
const fanSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect width="500" height="500" fill="#f8fafc" rx="20"/>
  <!-- Fan Guard Outer Circle -->
  <circle cx="250" cy="200" r="120" fill="none" stroke="#0284c7" stroke-width="8"/>
  <circle cx="250" cy="200" r="100" fill="none" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Center Cap -->
  <circle cx="250" cy="200" r="30" fill="#0284c7"/>
  <!-- Blades -->
  <path d="M 250 170 C 220 100 280 100 250 170 Z" fill="#38bdf8"/>
  <path d="M 275 215 C 345 235 325 295 275 215 Z" fill="#38bdf8"/>
  <path d="M 225 215 C 155 235 175 295 225 215 Z" fill="#38bdf8"/>
  <!-- Stand & Base -->
  <rect x="242" y="320" width="16" height="100" fill="#64748b"/>
  <ellipse cx="250" cy="420" rx="70" ry="20" fill="#334155"/>
  <text x="250" y="460" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0284c7" text-anchor="middle">PEDESTAL FAN</text>
</svg>`;

fs.writeFileSync(path.join(publicImgDir, 'product_geyser.svg'), geyserSVG);
fs.writeFileSync(path.join(publicImgDir, 'product_geyser.png'), geyserSVG); // svg compatibility
fs.writeFileSync(path.join(publicImgDir, 'product_heater.svg'), heaterSVG);
fs.writeFileSync(path.join(publicImgDir, 'product_heater.png'), heaterSVG);
fs.writeFileSync(path.join(publicImgDir, 'product_fan.svg'), fanSVG);
fs.writeFileSync(path.join(publicImgDir, 'product_fan.png'), fanSVG);

console.log("✅ Successfully created crisp local vector SVG appliance cutouts in public/images/!");
