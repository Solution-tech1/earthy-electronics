const mysql = require('mysql2/promise');

async function inspectTclAndEcoStar() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [tclRows] = await db.query("SELECT id, name, category, brand, image FROM products WHERE name LIKE '%TCL%' OR name LIKE '%TAC%'");
  console.log("==================================================");
  console.log(`📺 TCL PRODUCTS IN DB (${tclRows.length}):`);
  tclRows.forEach(r => console.log(`  [ID: ${r.id}] ${r.name} -> ${r.image}`));

  const [ecoRows] = await db.query("SELECT id, name, category, brand, image FROM products WHERE name LIKE '%Ecostar%' OR name LIKE '%Emperor%'");
  console.log("\n❄️ ECOSTAR PRODUCTS IN DB (${ecoRows.length}):");
  ecoRows.forEach(r => console.log(`  [ID: ${r.id}] ${r.name} -> ${r.image}`));

  await db.end();
}

inspectTclAndEcoStar().catch(console.error);
