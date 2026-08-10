const fs = require('fs');
const path = require('path');

function copyDistinctCategorySamples() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const samples = [
    { cat: 'Refrigerator', model: 'Haier HRF-316 EPR/EPB Glass Door', src: 'haier-haier-hrf-316-epr-epb.jpg', target: 'truly_diff_refrigerator.jpg' },
    { cat: 'Washing Machine', model: 'Haier HWM 100-1269 Top Load Auto', src: 'haier-haier-10-kg-fully-automatic-top-loading-washing-machine-hwm-100-1269.jpg', target: 'truly_diff_washer.jpg' },
    { cat: 'Microwave Oven', model: 'Haier HGL-30100 30L Convection Oven', src: 'haier-haier-convection-microwave-oven-30-liter-model-hgl-30100.jpg', target: 'truly_diff_microwave.jpg' },
    { cat: 'Air Conditioner', model: 'Haier HSU-20HFTEX 1.5 Ton T3 Inverter AC', src: 'haier-haier-1-5ton-t3-inverter-ac-hsu-20hftex.jpg', target: 'truly_diff_ac.jpg' }
  ];

  console.log("Copying 4 TRULY DISTINCT category samples to artifacts directory...");

  samples.forEach(s => {
    const srcAbs = path.join(publicProductsDir, s.src);
    const targetAbs = path.join(artifactsDir, s.target);

    if (fs.existsSync(srcAbs)) {
      fs.copyFileSync(srcAbs, targetAbs);
      console.log(`✅ Copied [${s.cat}] ${s.src} -> ${targetAbs}`);
    } else {
      console.log(`⚠️ Source missing: ${srcAbs}`);
    }
  });
}

copyDistinctCategorySamples();
