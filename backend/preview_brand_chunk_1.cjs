const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const targetBrand = (process.argv[2] || 'Dawlance').toLowerCase();

const OFFICIAL_URLS = {
  dawlance: 'https://www.dawlance.com.pk',
  haier: 'https://www.haier.com/pk',
  pel: 'https://pel.com.pk',
  superasia: 'https://superasiastore.com',
  kenwood: 'https://www.kenwoodpakistan.pk',
  gree: 'https://dwphome.pk/gree',
  tcl: 'https://www.tclpakistan.com',
  orient: 'https://www.orient.com.pk',
  ecostar: 'https://dwphome.pk/ecostar',
  westpoint: 'https://www.westpoint.pk',
  samsung: 'https://www.samsung.com/pk',
  homage: 'https://homage.pk',
  philips: 'https://philipsappliances.pk',
  royal: 'https://royalfans.com',
  twister: 'https://www.orient.com.pk'
};

const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
const rows = [];

if (fs.existsSync(unmatchedCsvPath)) {
  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', () => {
      const brandRows = rows.filter(r => {
        const b = (r.Brand || '').toLowerCase();
        const m = (r.Model_Name || '').toLowerCase();
        
        if (targetBrand === 'dawlance') return b.includes('dawlance') || m.startsWith('dw-') || m.startsWith('dwt');
        if (targetBrand === 'haier') return b.includes('haier') || m.startsWith('hwm') || m.startsWith('hw-') || m.startsWith('hmn') || m.startsWith('hmw') || m.startsWith('hgl') || m.startsWith('hmo') || m.startsWith('hwd');
        if (targetBrand === 'gree') return b.includes('gree');
        if (targetBrand === 'tcl') return b.includes('tcl') || m.startsWith('tac');
        if (targetBrand === 'pel') return b.includes('pel') || m.startsWith('pmo') || m.startsWith('pawm') || m.startsWith('pwd') || m.startsWith('pwms');
        if (targetBrand === 'orient') return b.includes('orient') || m.startsWith('hes-');
        if (targetBrand === 'kenwood') return b.includes('kenwood') || m.startsWith('kea') || m.startsWith('kei') || m.startsWith('kel') || m.startsWith('ken') || m.startsWith('keo') || m.startsWith('kes') || m.startsWith('kwm') || m.startsWith('kws');
        if (targetBrand === 'westpoint') return b.includes('westpoint');
        if (targetBrand === 'superasia') return b.includes('super') || m.startsWith('sa') || m.startsWith('sd');
        if (targetBrand === 'ecostar') return b.includes('ecostar');
        
        return b.includes(targetBrand);
      });

      console.log(`==================================================`);
      console.log(`🏷️ BRAND: ${targetBrand.toUpperCase()}`);
      console.log(`🌐 Official Website: ${OFFICIAL_URLS[targetBrand] || 'Official Brand Portal'}`);
      console.log(`📦 Total Unmatched Items Found: ${brandRows.length}`);
      console.log(`==================================================\n`);

      const chunk1 = brandRows.slice(0, 50);
      console.log(`=== CHUNK 1 (PRODUCTS 1 TO ${chunk1.length}) PREVIEW ===\n`);

      chunk1.forEach((r, idx) => {
        console.log(`${idx + 1}. [${r.Brand}] ${r.Model_Name} | Category: ${r.Category} | Rate: Rs. ${r.Rate || 'N/A'}`);
      });

      process.exit(0);
    });
}
