const fs = require('fs');
const path = require('path');

const keepFiles = new Set([
  'server.js',
  'package.json',
  'package-lock.json',
  '.env',
  'schema.sql',
  'mariadb.zip',
  'all_products_dump.txt',
  'NEW PORTAL WESTPOINT APPLIANCES.csv'
]);

const keepDirs = new Set([
  'mariadb_ext',
  'node_modules',
  'product files',
  'all products files',
  'products_by_category',
  'WhatsApp Unknown 2026-07-21 at 11.16.07 PM'
]);

const backendDir = __dirname;
const items = fs.readdirSync(backendDir);

let deletedCount = 0;

items.forEach(item => {
  if (item === 'cleanup_useless_backend_files.cjs') return;
  const fullPath = path.join(backendDir, item);
  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    if (!keepDirs.has(item)) {
      console.log(`Skipping directory: ${item}`);
    }
  } else {
    if (!keepFiles.has(item)) {
      try {
        fs.unlinkSync(fullPath);
        deletedCount++;
        console.log(`Deleted temporary script: ${item}`);
      } catch (err) {
        console.error(`Failed to delete ${item}:`, err.message);
      }
    }
  }
});

console.log(`\n✅ Cleaned up ${deletedCount} useless temporary scripts from backend directory!`);
