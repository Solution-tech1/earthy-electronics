const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

async function runBatches() {
  const db = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  let count = -1;
  let batchNum = 1;

  while (true) {
    const [rows] = await db.query(
      "SELECT COUNT(*) as c FROM products WHERE (name LIKE '%floor standing%' OR name LIKE '%cabinet%' OR name LIKE '%cassette%' OR name LIKE '%front load%' OR name LIKE '%chest%' OR name LIKE '%upright%' OR name LIKE '%side by side%') AND (image IS NULL OR image LIKE '/images/cat_%' OR image LIKE '%product_fridge%' OR image LIKE '%product_washer%')"
    );
    count = rows[0].c;

    console.log(`\n================================`);
    console.log(`BATCH ${batchNum} STARTING (Remaining Items: ${count})`);
    console.log(`================================`);

    if (count === 0) {
      console.log("All Masla 1 items are fully updated!");
      break;
    }

    try {
      execSync('node bing_search_m1.cjs', { stdio: 'inherit' });
    } catch (e) {
      console.log(`Batch ${batchNum} encountered an error or crash. Restarting next batch...`);
    }

    batchNum++;
    // Small delay between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  await db.end();
}

runBatches().catch(console.error);
