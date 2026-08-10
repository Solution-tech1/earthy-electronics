const mysql = require('mysql2/promise');

async function inspectSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const [cols] = await connection.query("DESCRIBE products");
  console.log("Database Columns:", cols.map(c => c.Field));
  await connection.end();
}

inspectSchema();
