const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const unmatchedCsvPath = path.join(__dirname, 'product files', 'UNMATCHED_Products_List.csv');
const rows = [];

if (fs.existsSync(unmatchedCsvPath)) {
  fs.createReadStream(unmatchedCsvPath)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', () => {
      const brandCounts = {};
      
      rows.forEach(r => {
        let b = (r.Brand || 'Generic').trim();
        // Clean brand name mapping
        if (b.toLowerCase().includes('westpoint')) b = 'WestPoint';
        else if (b.toLowerCase().includes('haier') || b.startsWith('HWM') || b.startsWith('HW-')) b = 'Haier';
        else if (b.toLowerCase().includes('dawlance') || b.startsWith('DW-') || b.startsWith('DWT')) b = 'Dawlance';
        else if (b.toLowerCase().includes('gree')) b = 'Gree';
        else if (b.toLowerCase().includes('tcl') || b.startsWith('TAC')) b = 'TCL';
        else if (b.toLowerCase().includes('orient') || b.startsWith('HES-')) b = 'Orient';
        else if (b.toLowerCase().includes('kenwood') || b.startsWith('KEA') || b.startsWith('KEI') || b.startsWith('KEL') || b.startsWith('KEN') || b.startsWith('KEO') || b.startsWith('KES') || b.startsWith('KWM') || b.startsWith('KWS')) b = 'Kenwood';
        else if (b.toLowerCase().includes('pel') || b.startsWith('PMO') || b.startsWith('PAWM') || b.startsWith('PWD') || b.startsWith('PWMS')) b = 'PEL';
        else if (b.toLowerCase().includes('super') || b.startsWith('SA') || b.startsWith('SD')) b = 'Super Asia';
        else if (b.toLowerCase().includes('ecostar')) b = 'Ecostar';
        else if (b.toLowerCase().includes('homage')) b = 'Homage';
        else if (b.toLowerCase().includes('philips')) b = 'Philips';
        else if (b.toLowerCase().includes('royal') || b.startsWith('RWM') || b.startsWith('RD-')) b = 'Royal';
        else if (b.toLowerCase().includes('twister')) b = 'Twister';

        brandCounts[b] = (brandCounts[b] || 0) + 1;
      });

      console.log("=== UNMATCHED PRODUCTS BRAND BREAKDOWN ===");
      Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([brand, cnt]) => {
          console.log(`• ${brand}: ${cnt} products`);
        });

      process.exit(0);
    });
}
