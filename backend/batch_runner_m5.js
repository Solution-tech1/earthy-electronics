const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const colorKeywords = ['white', 'black', 'silver', 'grey', 'gray', 'red', 'green', 'blue', 'chrome', 'gold', 'champagne', 'purple', 'pink', 'brown', 'maroon'];

function getColorDiffs(name) {
  return colorKeywords.filter(c => name.toLowerCase().includes(c));
}

function hasColorDifference(name1, name2) {
  const c1 = getColorDiffs(name1);
  const c2 = getColorDiffs(name2);
  if (c1.length !== c2.length) return true;
  for (let i = 0; i < c1.length; i++) {
    if (c1[i] !== c2[i]) return true;
  }
  return false;
}

async function runBatch() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'earthy_elec' });
  
  // Total to process
  let [totalRows] = await c.query('SELECT COUNT(*) as cnt FROM products WHERE image IS NULL OR image LIKE "/images/cat_%"');
  let initialTotal = totalRows[0].cnt;
  console.log(`==================================================`);
  console.log(`🚀 BATCH RUNNER M5 V2 STARTING (Total Items: ${initialTotal})`);
  console.log(`==================================================\n`);

  let globalProcessed = 0;
  let batchProcessedCount = 0;
  let statUniqueImages = 0;
  let statSharedImages = 0;

  while (true) {
    // Get ALL remaining items to group them properly, but only process 5 GROUPS at a time
    const [allRemaining] = await c.query('SELECT id, name, category, brand FROM products WHERE image IS NULL OR image LIKE "/images/cat_%"');
    
    if (allRemaining.length === 0) {
      console.log(`\n==================================================`);
      console.log(`✅ ALL M5 ITEMS COMPLETED SUCCESSFULLY!`);
      console.log(`==================================================`);
      break;
    }

    // Grouping logic
    const groups = {};
    for (const p of allRemaining) {
      const words = p.name.split(' ');
      const baseKey = `${p.brand}-${p.category}-${words.slice(0, 3).join(' ')}`.toLowerCase();
      if (!groups[baseKey]) groups[baseKey] = [];
      groups[baseKey].push(p);
    }

    const groupKeys = Object.keys(groups); // Process all groups until 50 items
    for (const key of groupKeys) {
      const groupVariants = groups[key];
      console.log(`\n================================`);
      console.log(`GROUP: ${key} (${groupVariants.length} variants)`);
      console.log(`================================`);
      
      const successfulImages = []; // Array of { name, imagePath }
      
      for (const variant of groupVariants) {
        console.log(`\n  [ID ${variant.id}] Searching for: "${variant.name}" ...`);
        
        try {
          const cmd = `node google_search_m5.cjs ${variant.id} "${variant.name.replace(/"/g, '\\"')}" "${variant.category.replace(/"/g, '\\"')}" "${variant.brand.replace(/"/g, '\\"')}"`;
          const { stdout, stderr } = await execPromise(cmd, { timeout: 120000 });
          
          if (stdout) console.log(stdout.trim().split('\n').map(l => '    ' + l).join('\n'));
          if (stderr) console.error('    ERR:', stderr.trim());
          
          // Check if it succeeded by parsing stdout
          const match = stdout.match(/Updated -> (\/images\/products\/[^\s]+)/);
          if (match && match[1]) {
            successfulImages.push({ name: variant.name, id: variant.id, imagePath: match[1] });
            statUniqueImages++;
            batchProcessedCount++;
            globalProcessed++;
            continue; // Successfully found unique image!
          }
        } catch (e) {
          console.error(`    💥 CRASH / TIMEOUT on item ${variant.id}:`, e.message);
        }
        
        // IF WE REACH HERE, SEARCH FAILED FOR THIS VARIANT
        console.log(`    ❌ Unique image not found for variant.`);
        
        // Check if we can share an image from a successful variant in this group
        let shared = false;
        for (const success of successfulImages) {
          if (!hasColorDifference(variant.name, success.name)) {
            // Safe to share!
            console.log(`    🔄 Sharing image from variant ID ${success.id} (No color difference).`);
            await c.query('UPDATE products SET image = ? WHERE id = ?', [success.imagePath, variant.id]);
            statSharedImages++;
            batchProcessedCount++;
            globalProcessed++;
            shared = true;
            break;
          }
        }
        
        if (!shared) {
          console.log(`    ⚠️ Cannot share image (Color difference detected or no successful images yet). Leaving as NO_IMAGE.`);
          // To prevent infinite loop, we must mark it so it's not selected again by 'image IS NULL'
          await c.query('UPDATE products SET image = ? WHERE id = ?', ['NO_IMAGE_FOUND', variant.id]);
          batchProcessedCount++;
          globalProcessed++;
        }
        
        await delay(2000);
        
        if (globalProcessed >= 50) {
          console.log(`\n==================================================`);
          console.log(`📈 BATCH FINISHED: 50 items processed.`);
          console.log(`   Unique Images: ${statUniqueImages} | Shared Images: ${statSharedImages}`);
          console.log(`==================================================\n`);
          
          await c.query('UPDATE products SET image = NULL WHERE image = "NO_IMAGE_FOUND"');
          await c.end();
          process.exit(0);
        }
      }
      
      await delay(3000);
    }
  }

  // Final cleanup
  await c.query('UPDATE products SET image = NULL WHERE image = "NO_IMAGE_FOUND"');
  await c.end();
}

runBatch().catch(console.error);
