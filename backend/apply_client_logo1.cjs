const fs = require('fs');
const path = require('path');

const src = `C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\\client_earth_logo1.png`;
const dest = path.join(__dirname, '..', 'frontend', 'public', 'images', 'earthyelectronics_logo.png');

fs.copyFileSync(src, dest);
console.log("✅ Applied Client Logo Option 1 to website header & footer!");
