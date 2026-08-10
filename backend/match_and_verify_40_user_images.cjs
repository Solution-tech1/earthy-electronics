const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function matchAndVerify40UserImages() {
  console.log("==================================================");
  console.log("📦 MATCHING & VERIFYING USER'S 37 PRODUCT IMAGES (FRIEND BATCH)");
  console.log("==================================================");

  const srcFolder = path.join(__dirname, 'all products files', 'products');
  const targetFolder = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');

  if (!fs.existsSync(srcFolder)) {
    console.error("Error: srcFolder missing:", srcFolder);
    return;
  }

  const friendListPath = path.join(__dirname, 'Friend_Batch_100_Products.md');
  const mdText = fs.readFileSync(friendListPath, 'utf8');

  // Parse first 40 models from Friend_Batch_100_Products.md
  const lines = mdText.split('\n').filter(l => l.startsWith('|') && !l.includes('Brand'));
  const first40Models = [];

  lines.forEach(l => {
    const parts = l.split('|').map(s => s.trim());
    if (parts.length >= 6) {
      const sno = parseInt(parts[1]);
      if (!isNaN(sno) && sno <= 40) {
        first40Models.push({
          sno: sno,
          brand: parts[2],
          category: parts[3],
          model: parts[4],
          rate: parts[5]
        });
      }
    }
  });

  const diskFiles = fs.readdirSync(srcFolder);

  const mappingRules = [
    { key: 'dw7200 cfl', matches: ['DW-7200 CFL', 'DW-7200'] },
    { key: 'dw7200wfl', matches: ['DW-7200 WFL'] },
    { key: 'dwt270c_lvs+', matches: ['DWT-270 C LVS+'] },
    { key: 'dw14470es', matches: ['DW-14470 ES'] },
    { key: 'dw6550g', matches: ['DW-6550 G'] },
    { key: 'dw700', matches: ['DW-7200'] },
    { key: 'dw6000', matches: ['DW-6000'] },
    { key: 'dw9000', matches: ['DW-9000'] },
    { key: 'dw210solo', matches: ['DW-210 Solo'] },
    { key: 'hwm120_1678', matches: ['HWM 120-1678'] },
    { key: 'hwm85_826', matches: ['HWM 85-826'] },
    { key: 'hwm130_1217', matches: ['HWM-130-1217'] },
    { key: 'hwm150_1789', matches: ['HWM-150-1789'] },
    { key: 'pel-pmo-20bh', matches: ['PEL Microwave Oven PMO-20 BH Classic Plus'] },
    { key: 'PMO-30BG-Glamour', matches: ['PEL PMO 30BG Glamour Microwave Oven'] },
    { key: 'PMO-38BG-Glamour', matches: ['PEL PMO 38BG Glamour Microwave Oven'] },
    { key: 'PMO-23-Desire', matches: ['PEL PMO-23 Desire Microwave Oven'] },
    { key: 'PMO-23-SLM-Desire', matches: ['PEL PMO-23 SLM 23 Ltr Desire'] },
    { key: 'PMO-25-Convection', matches: ['PEL PMO-25 Convection Microwave'] },
    { key: 'PMO-26-Chef-Digital', matches: ['PEL PMO-26 Chef Digital Microwave'] },
    { key: 'PMO-26-Desire', matches: ['PEL PMO-26 Desire Microwave Oven'] },
    { key: 'PMO-30-Desire', matches: ['Pel PMO-30 Desire Microwave Oven'] },
    { key: 'Philips-Espresso', matches: ['Philips Espresso EP2220'] },
    { key: 'Elite-TAC-24HEA', matches: ['TCL Elite TAC-24HEA 2 Ton'] },
    { key: 'hwm100-as', matches: ['HWM 100 AS'] },
    { key: 'hwm100bs', matches: ['HWM 100 BS'] },
    { key: 'hwm100-1678e', matches: ['HWM 100-1678 E'] },
    { key: 'hwm120-1678es9', matches: ['HWM 120-1678 ES9'] },
    { key: 'hwm80as', matches: ['HWM 80 AS'] },
    { key: 'hwm120-1978', matches: ['HWM-120 1978'] },
    { key: 'hwm120-35', matches: ['HWM-120-35'] },
    { key: 'hwm130-1217gb', matches: ['HWM-130-1217 GB'] },
    { key: 'hwm-49101-spinner', matches: ['HWM-49101Spinner'] },
    { key: 'hwm-4991', matches: ['HWM-4991'] },
    { key: 'hwm-80-1269-x', matches: ['HWM-80-1269 X'] },
    { key: 'hwm-105-b-14959-s8', matches: ['HW-105-B 14959 S8'] },
    { key: 'hwm-120as', matches: ['HWM 120AS M/W'] }
  ];

  const resultsTable = [];

  for (const item of first40Models) {
    // Find matching image file
    const matchedRule = mappingRules.find(r => r.matches.some(m => item.model.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(item.model.toLowerCase())));
    let foundFile = null;

    if (matchedRule) {
      foundFile = diskFiles.find(f => f.toLowerCase().includes(matchedRule.key.toLowerCase()));
    }

    if (!foundFile) {
      // Direct substring match
      foundFile = diskFiles.find(f => {
        const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanM = item.model.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanF.includes(cleanM) || cleanM.includes(cleanF);
      });
    }

    let status = "MATCHED_AND_VERIFIED";
    let targetPath = null;

    if (foundFile) {
      const slug = `${item.brand}-${item.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const targetFileName = `${slug}.jpg`;
      const srcAbs = path.join(srcFolder, foundFile);
      const destAbs = path.join(targetFolder, targetFileName);

      fs.copyFileSync(srcAbs, destAbs);
      targetPath = `/images/products/${targetFileName}`;
    } else {
      status = "NO_IMAGE_IN_FOLDER";
    }

    resultsTable.push({
      sno: item.sno,
      brand: item.brand,
      category: item.category,
      model: item.model,
      rate: item.rate,
      imageFileFound: foundFile || 'None (Missing in folder)',
      targetPath: targetPath || 'None',
      status: status
    });
  }

  console.log("\n==================================================");
  console.log("📊 MATCHING & VERIFICATION SUMMARY (FIRST 40 MODELS)");
  console.log("==================================================");
  const matchedCount = resultsTable.filter(r => r.status === 'MATCHED_AND_VERIFIED').length;
  console.log(`✅ MATCHED & VERIFIED WITH IMAGES: ${matchedCount} / 40`);
  console.log(`⚠️ MISSING IN USER FOLDER: ${40 - matchedCount} / 40`);
  console.log("==================================================\n");

  fs.writeFileSync(path.join(__dirname, 'matched_40_user_images_report.json'), JSON.stringify(resultsTable, null, 2), 'utf8');

  process.exit(0);
}

matchAndVerify40UserImages();
