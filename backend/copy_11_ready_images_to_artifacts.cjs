const fs = require('fs');
const path = require('path');

function copy11ReadyImages() {
  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const publicProductsDir = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  const readyItems = [
    { model: 'HRF-368 EBS/EBD', src: 'haier-hrf-368-epr-epb.jpg', target: 'ready_hrf_368_ebs.jpg' },
    { model: 'HRF-398 EBS/EBD', src: 'haier-hrf-398-epr-epb.jpg', target: 'ready_hrf_398_ebs.jpg' },
    { model: 'HRF-438 EBS/EBD', src: 'haier-hrf-438-epr-epb.jpg', target: 'ready_hrf_438_ebs.jpg' },
    { model: 'HRF-316 EPR/EPB', src: 'haier-haier-hrf-316-epr-epb.jpg', target: 'ready_hrf_316_epr.jpg' },
    { model: 'HRF-438 EPR/EPB', src: 'haier-haier-hrf-438-epr-epb.jpg', target: 'ready_hrf_438_epr.jpg' },
    { model: 'HRF-538 EPR/EPG', src: 'haier-haier-hrf-538-epr-epg.jpg', target: 'ready_hrf_538_epg.jpg' },
    { model: 'HRF-578 TBGU1 (IOT)', src: 'haier-haier-hrf-538-tifg1u1-tifb1u1-iot.jpg', target: 'ready_hrf_578_iot.jpg' },
    { model: 'HRF-678 TGG', src: 'haier-haier-hrf-538-ifga-ifra-ifpa.jpg', target: 'ready_hrf_678_tgg.jpg' },
    { model: 'HRF-578 TBG', src: 'haier-haier-hrf-538-ipra-ipga-ippa.jpg', target: 'ready_hrf_578_tbg.jpg' },
    { model: 'HRF-622 IBG', src: 'haier-haier-hrf-538-iapa-iara.jpg', target: 'ready_hrf_622_ibg.jpg' },
    { model: 'HRF-622 IBS', src: 'haier-haier-hrf-538-idga-idrga.jpg', target: 'ready_hrf_622_ibs.jpg' }
  ];

  console.log("Copying 11 READY_TO_UPLOAD images to artifacts directory...");

  readyItems.forEach(s => {
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

copy11ReadyImages();
