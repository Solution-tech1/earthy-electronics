const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

async function auditAndFix() {
  console.log("==================================================");
  console.log("🔍 AUDITING MISSING & DUPLICATE IMAGES IN MARIADB");
  console.log("==================================================");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bismillah_elec'
  });

  const [rows] = await db.query('SELECT id, name, category, brand, image FROM products ORDER BY id ASC');
  console.log(`Total Products in DB: ${rows.length}`);

  const missingList = rows.filter(r => !r.image || r.image === '' || r.image.includes('placeholder'));
  console.log(`\n❌ PRODUCTS WITH MISSING/PLACEHOLDER IMAGES (${missingList.length}):`);
  missingList.forEach(r => console.log(`  [ID: ${r.id}] [${r.brand}] ${r.name} -> Image: ${r.image}`));

  // Check duplicate images
  const imageCounts = {};
  rows.forEach(r => {
    if (r.image && !r.image.includes('placeholder')) {
      imageCounts[r.image] = (imageCounts[r.image] || 0) + 1;
    }
  });

  const duplicateImages = Object.keys(imageCounts).filter(img => imageCounts[img] > 1);
  console.log(`\n⚠️ DUPLICATE IMAGES SHARED ACROSS MULTIPLE PRODUCTS (${duplicateImages.length}):`);
  duplicateImages.forEach(img => {
    const sharedProducts = rows.filter(r => r.image === img);
    console.log(`  Image: ${img} (Shared by ${sharedProducts.length} products)`);
    sharedProducts.forEach(p => console.log(`    -> [ID: ${p.id}] ${p.name}`));
  });

  await db.end();
  console.log("==================================================\n");
}

auditAndFix().catch(console.error);
