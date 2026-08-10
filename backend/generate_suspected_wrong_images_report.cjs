const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAuditReport() {
  console.log("==================================================");
  console.log("🔍 STEP 1 & STEP 2: SITE-WIDE IMAGE AUDIT & REPORT GENERATION");
  console.log("🔒 READ-ONLY MODE: ZERO DB OR FILE MODIFICATIONS");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [products] = await db.query('SELECT id, name, category, brand, image FROM products');
  console.log(`Total Products to Audit in DB: ${products.length}\n`);

  const publicDir = path.join(__dirname, '..', 'frontend', 'public');

  // Count image occurrences for Duplicate Sharing check (Criteria 4)
  const imageCounts = {};
  products.forEach(p => {
    const img = p.image || '';
    if (img && img.trim() !== '') {
      imageCounts[img] = (imageCounts[img] || 0) + 1;
    }
  });

  const suspectedList = [];
  let flagIndex = 0;

  for (const p of products) {
    const rawImgPath = p.image || '';
    let isFlagged = false;
    let reasons = [];

    if (!rawImgPath || rawImgPath.trim() === '') {
      continue; // Empty image is already in NO_IMAGE state
    }

    // Criteria 4: Duplicate image shared across 2 or more different models
    if (imageCounts[rawImgPath] && imageCounts[rawImgPath] > 1) {
      isFlagged = true;
      reasons.push(`Duplicate image shared across ${imageCounts[rawImgPath]} different models`);
    }

    // Check remote vs local
    if (rawImgPath.startsWith('http')) {
      isFlagged = true;
      reasons.push("Remote search thumbnail link (unverified web scrape)");
    } else {
      const absPath = path.join(publicDir, rawImgPath.replace(/^\//, ''));

      if (!fs.existsSync(absPath)) {
        isFlagged = true;
        reasons.push("Image file missing on local disk");
      } else {
        try {
          const stat = fs.statSync(absPath);
          const metadata = await sharp(absPath).metadata();

          // Criteria 5: Extremely low resolution or tiny filesize indicating thumbnail/stock icon
          if (stat.size < 2000) {
            isFlagged = true;
            reasons.push(`Filesize too small (${stat.size} bytes) - likely icon/thumbnail`);
          }

          if (metadata.width < 120 || metadata.height < 120) {
            isFlagged = true;
            reasons.push(`Low resolution (${metadata.width}x${metadata.height})`);
          }

          // Criteria 3: Category mismatch check
          const categoryLower = (p.category || '').toLowerCase();
          const fnameLower = path.basename(absPath).toLowerCase();

          if (categoryLower.includes('wash') && (fnameLower.includes('ac') || fnameLower.includes('fridge') || fnameLower.includes('dispenser') || fnameLower.includes('tv'))) {
            isFlagged = true;
            reasons.push("Category Mismatch (Washing Machine has AC/Fridge/Dispenser image filename)");
          } else if (categoryLower.includes('refrigerator') && (fnameLower.includes('washer') || fnameLower.includes('ac') || fnameLower.includes('dispenser'))) {
            isFlagged = true;
            reasons.push("Category Mismatch (Refrigerator has Washer/AC/Dispenser image filename)");
          } else if (categoryLower.includes('air conditioner') && (fnameLower.includes('washer') || fnameLower.includes('fridge') || fnameLower.includes('dispenser'))) {
            isFlagged = true;
            reasons.push("Category Mismatch (Air Conditioner has Washer/Fridge/Dispenser image filename)");
          }

        } catch (err) {
          isFlagged = true;
          reasons.push(`Corrupt image file format (${err.message})`);
        }
      }
    }

    if (isFlagged) {
      flagIndex++;
      suspectedList.push({
        s_no: flagIndex,
        product_id: p.id,
        product_model: p.name,
        brand: p.brand || '',
        category: p.category || '',
        current_image_url: rawImgPath,
        reason_flagged: reasons.join('; ')
      });
    }
  }

  // Create CSV file "Suspected_Wrong_Images.csv"
  const csvPath = path.join(__dirname, 'product files', 'Suspected_Wrong_Images.csv');
  let csvContent = 'S_No,Product_ID,Brand,Product_Model,Category,Current_Image_URL,Reason_Flagged\n';

  suspectedList.forEach(r => {
    csvContent += `"${r.s_no}","${r.product_id}","${r.brand.replace(/"/g, '""')}","${r.product_model.replace(/"/g, '""')}","${r.category.replace(/"/g, '""')}","${r.current_image_url.replace(/"/g, '""')}","${r.reason_flagged.replace(/"/g, '""')}"\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf8');

  // Save report JSON for quick inspection
  fs.writeFileSync(path.join(__dirname, 'suspected_wrong_images.json'), JSON.stringify(suspectedList, null, 2), 'utf8');

  console.log("==================================================");
  console.log(`📊 AUDIT SUMMARY: Found ${suspectedList.length} Suspected Wrong / Duplicate Images out of ${products.length} Products`);
  console.log(`📄 Report CSV generated at: ${csvPath}`);
  console.log("🔒 READ-ONLY GUARANTEE: Database and disk files were NOT modified.");
  console.log("==================================================\n");

  await db.end();
}

generateAuditReport().catch(console.error);
