const fs = require('fs');
const path = require('path');

function copySamples() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const samples = [
    { title: 'Haier HRF-538 EPG/EPR Glass Door', src: 'haier-haier-hrf-538-epr-epg.jpg', target: 'sample_hrf_538_epg.jpg' },
    { title: 'Haier HRF-538 IDGA Digital Inverter', src: 'haier-haier-hrf-538-idga-idrga.jpg', target: 'sample_hrf_538_idga.jpg' },
    { title: 'Haier HRF-538 IAPA E-Smart Inverter', src: 'haier-haier-hrf-538-iapa-iara.jpg', target: 'sample_hrf_538_iapa.jpg' },
    { title: 'Haier HRF-538 TIFG1U1 IOT Inverter', src: 'haier-haier-hrf-538-tifg1u1-tifb1u1-iot.jpg', target: 'sample_hrf_538_iot.jpg' }
  ];

  console.log("Copying existing verified sample images to artifacts directory...");

  samples.forEach(s => {
    const srcAbs = path.join(publicProductsDir, s.src);
    const targetAbs = path.join(artifactsDir, s.target);

    if (fs.existsSync(srcAbs)) {
      fs.copyFileSync(srcAbs, targetAbs);
      console.log(`✅ Copied ${s.src} -> ${targetAbs}`);
    } else {
      console.log(`⚠️ Source missing: ${srcAbs}`);
    }
  });
}

copySamples();
