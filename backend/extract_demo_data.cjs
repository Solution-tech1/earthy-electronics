const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

async function extractProductsForDemo() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'earthyelectronics'
    });

    console.log('Connected to MySQL. Extracting products...');
    
    // Fetch products, group variants if necessary, or just fetch all
    const [products] = await connection.execute('SELECT * FROM products');
    
    // Convert blob or weird formats if any, but usually it's just strings/numbers
    const cleanProducts = products.map(p => ({
      ...p,
      image: p.image ? String(p.image) : '/images/placeholder.png'
    }));

    // In the real app, the API groups products by name.
    // Let's check how the backend sends data.
    // Actually, the easiest way is to just call the local API and save the response!
    console.log(`Extracted ${cleanProducts.length} raw products. Wait, let's fetch from the local API directly for perfect formatting!`);
    await connection.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

extractProductsForDemo();
