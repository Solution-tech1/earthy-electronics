const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrateDb() {
  console.log("==================================================");
  console.log("🛠️ RENAMING MARIADB DATABASE TO 'earthy_elec'");
  console.log("==================================================");

  const rootConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  await rootConn.query('CREATE DATABASE IF NOT EXISTS earthy_elec DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log("✅ Created database: earthy_elec");

  const oldDb = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'bismillah_elec' });
  const newDb = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'earthy_elec' });

  await newDb.query('SET FOREIGN_KEY_CHECKS = 0');

  const [tables] = await oldDb.query('SHOW TABLES');
  for (const tRow of tables) {
    const tableName = Object.values(tRow)[0];
    console.log(`Migrating table: ${tableName}...`);

    const [createTableStmt] = await oldDb.query(`SHOW CREATE TABLE \`${tableName}\``);
    const sql = createTableStmt[0]['Create Table'];
    await newDb.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    await newDb.query(sql);

    const [rows] = await oldDb.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const placeholders = keys.map(() => '?').join(', ');
      const insertSql = `INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = keys.map(k => row[k]);
        await newDb.query(insertSql, values);
      }
    }
    console.log(`   ✅ Table ${tableName} migrated (${rows.length} rows)`);
  }

  await newDb.query('SET FOREIGN_KEY_CHECKS = 1');

  await rootConn.end();
  await oldDb.end();
  await newDb.end();

  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = `DB_HOST=localhost\nDB_USER=root\nDB_PASSWORD=\nDB_NAME=earthy_elec\nPORT=5000\n`;
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log("==================================================");
  console.log("🎉 DATABASE RENAME & MIGRATION TO 'earthy_elec' COMPLETE!");
  console.log("==================================================\n");
}

migrateDb().catch(console.error);
