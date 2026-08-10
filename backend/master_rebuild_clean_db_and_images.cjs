const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function masterRebuildCleanDbAndImages() {
  console.log("==================================================");
  console.log("🚀 MASTER REBUILD OF ALL PRODUCTS & HD CUTOUT IMAGES");
  console.log("==================================================");

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthy_elec'
  });

  const targetFolder = path.join(__dirname, '..', 'frontend', 'public', 'images', 'products');
  const sourceFolder = path.join(__dirname, 'all products files', 'products');

  // Copy all 37 user studio cutout files from source folder into public images
  if (fs.existsSync(sourceFolder)) {
    fs.readdirSync(sourceFolder).forEach(f => {
      fs.copyFileSync(path.join(sourceFolder, f), path.join(targetFolder, f));
    });
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("DELETE FROM products");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  const cleanSeedProducts = [
    // --- AIR CONDITIONERS ---
    { name: "Orient Everest 18w Geo White 1.5 Ton DC Inverter AC", brand: "Orient", category: "Air Conditioners", price: 135000, discountPrice: 125000, image: "https://www.orient.com.pk/assets/products-images-2026/air-conditioners/15-ton-everest-geo-white-dc-inverter.png.webp", description: "Orient 1.5 Ton Everest Geo White Inverter AC with T3 Tropicalized Compressor." },
    { name: "Orient Infinity 18x Silver Matt T3+ Inverter AC", brand: "Orient", category: "Air Conditioners", price: 145000, discountPrice: 135000, image: "https://www.orient.com.pk/assets/products-images-2026/air-conditioners/15-ton-megatron-infinity-ecomfort-dc-inverter.png.webp", description: "Orient 1.5 Ton Megatron Infinity Silver Matt Inverter AC." },
    { name: "Dawlance 15 Frost Pro 1 Ton Inverter Split AC", brand: "Dawlance", category: "Air Conditioners", price: 98000, discountPrice: 89000, image: "/images/product_ac.png", description: "Dawlance 1 Ton Frost Pro Inverter AC with Auto Clean function." },
    { name: "Dawlance 1.5 Ton 30 Infinity Pro Inverter AC", brand: "Dawlance", category: "Air Conditioners", price: 125000, discountPrice: 114000, image: "https://cdn.comverseglobal.com/alfa/products/product_images/30-infinity-pro_160226140327522124.png", description: "Dawlance 1.5 Ton 30 Infinity Pro Gold Fin Inverter AC." },
    { name: "Dawlance Aura X 30 1.5 Ton Inverter Split AC", brand: "Dawlance", category: "Air Conditioners", price: 128000, discountPrice: 118000, image: "https://cdn.comverseglobal.com/alfa/products/product_images/aurax1ton-2_1_220526180727264429.jpg", description: "Dawlance 1.5 Ton Aura X Inverter AC with Typhoon Airflow." },
    { name: "EcoStar 18t3pro 1.5 Ton Inverter Split AC", brand: "EcoStar", category: "Air Conditioners", price: 119000, discountPrice: 109000, image: "https://www.surmawala.pk/cdn/shop/files/t3-new.png?v=1754727601", description: "EcoStar 1.5 Ton T3 Pro Smart Inverter AC." },
    { name: "Gree GS-12FITH1W 1 Ton Inverter Split AC", brand: "Gree", category: "Air Conditioners", price: 108000, discountPrice: 98000, image: "/images/product_ac_2.png", description: "Gree 1 Ton Fairy Series Inverter AC with WiFi control." },
    { name: "Gree GS-18FITH1W 1.5 Ton Inverter Split AC", brand: "Gree", category: "Air Conditioners", price: 138000, discountPrice: 126000, image: "https://hadielectronics.com.pk/wp-content/uploads/2026/02/GS-18FITH1W.webp", description: "Gree 1.5 Ton Fairy Series Inverter AC with T3 Tropicalized Compressor." },

    // --- REFRIGERATORS ---
    { name: "Haier HRF-538TGG 21 CFT Side by Side Refrigerator", brand: "Haier", category: "Refrigerators", price: 155000, discountPrice: 142000, image: "/images/product_fridge_2.png", description: "Haier 21 CFT Side-by-Side Glass Door Inverter Refrigerator." },
    { name: "Dawlance DW-9191 FP INOX Refrigerator", brand: "Dawlance", category: "Refrigerators", price: 78000, discountPrice: 69000, image: "/images/product_fridge.png", description: "Dawlance 20 CFT Inverter Glass Door Refrigerator." },
    { name: "Haier HRF-316 EPR Glass Door Refrigerator", brand: "Haier", category: "Refrigerators", price: 68000, discountPrice: 61750, image: "/images/products/ready_hrf_316_epr.jpg", description: "Haier 11 CFT E-Star Red Glass Door Refrigerator." },

    // --- WASHING MACHINES ---
    { name: "Dawlance DW-7200 WFL Fully Automatic Washer", brand: "Dawlance", category: "Washing Machines", price: 58000, discountPrice: 52000, image: "/images/products/dw7200wfl.jpg", description: "Dawlance 9 KG Fully Automatic Front Load Washing Machine." },
    { name: "Dawlance DW-6550 G Twin Tub Washer", brand: "Dawlance", category: "Washing Machines", price: 39000, discountPrice: 34500, image: "/images/products/dw6550g.jpg", description: "Dawlance 8 KG Twin Tub Semi Automatic Washing Machine." },
    { name: "Dawlance DW-6000 Single Tub Spinner", brand: "Dawlance", category: "Washing Machines", price: 21000, discountPrice: 18500, image: "/images/products/dw6000.jpg", description: "Dawlance 6 KG Fast Spinner Dryer." },
    { name: "Haier HWM-85-1708 Semi Automatic Washer", brand: "Haier", category: "Washing Machines", price: 32000, discountPrice: 28000, image: "/images/product_washer.png", description: "Haier 8.5 KG Twin Tub Semi Automatic Washer." },
    { name: "Dawlance DWF-7120 Fully Automatic Front Load", brand: "Dawlance", category: "Washing Machines", price: 65000, discountPrice: 58000, image: "/images/product_washer_2.png", description: "Dawlance 7 KG Inverter Front Load Washing Machine." },

    // --- MICROWAVE OVENS ---
    { name: "Kenwood MWM-30 30L Microwave Oven", brand: "Kenwood", category: "Microwave Ovens", price: 16000, discountPrice: 13800, image: "/images/product_microwave.png", description: "Kenwood 30 Litre Grill Microwave Oven." },
    { name: "PEL PMO-20 BH Classic Plus Microwave", brand: "PEL", category: "Microwave Ovens", price: 26000, discountPrice: 23500, image: "/images/products/haier-pel-microwave-oven-pmo-20-bh-classic-plus-on-installment.jpg", description: "PEL 20 Litre Classic Plus Digital Microwave Oven." },
    { name: "PEL PMO-30BG Glamour Microwave Oven 30L", brand: "PEL", category: "Microwave Ovens", price: 42000, discountPrice: 38500, image: "/images/products/haier-pel-pmo-30bg-glamour-microwave-oven-30-ltr-on-istallments.jpg", description: "PEL 30 Litre Glamour Series Microwave Oven." },
    { name: "Dawlance DW-210 Solo Microwave Oven", brand: "Dawlance", category: "Microwave Ovens", price: 18000, discountPrice: 15700, image: "/images/products/dw210solo.jpg", description: "Dawlance 20 Litre Solo Heating Microwave Oven." },

    // --- KITCHEN APPLIANCES & WATER DISPENSERS ---
    { name: "WestPoint 1846 Air Fryer 4.5L", brand: "WestPoint", category: "Kitchen Appliances", price: 19500, discountPrice: 16800, image: "/images/products/truly_diff_microwave.jpg", description: "WestPoint 4.5 Litre Digital Air Fryer with Rapid Air Tech." },
    { name: "Haier HWD-311 Water Dispenser", brand: "Haier", category: "Water Dispensers", price: 16500, discountPrice: 14500, image: "/images/product_dispenser.png", description: "Haier 3 Tap Hot & Cold Compressor Water Dispenser." },
    { name: "PEL 215 Pearl Water Dispenser", brand: "PEL", category: "Water Dispensers", price: 42000, discountPrice: 38000, image: "/images/products/haier-pel-pmo-23-desire-microwave-oven-on-installments.jpg", description: "PEL Pearl Series Hot & Cold Water Dispenser." },
    { name: "Philips Espresso EP2220 Fully Automatic Coffee Machine", brand: "Philips", category: "Kitchen Appliances", price: 175000, discountPrice: 160000, image: "/images/products/haier-philips-espresso-ep2220-fully-automatic-espresso-machines-on-installments.jpg", description: "Philips EP2220 Automatic Bean-to-Cup Espresso Coffee Maker." }
  ];

  for (const p of cleanSeedProducts) {
    await connection.query(
      "INSERT INTO products (name, brand, category, price, discountPrice, image, description, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 10, NOW())",
      [p.name, p.brand, p.category, p.price, p.discountPrice, p.image, p.description]
    );
  }

  const [finalDb] = await connection.query("SELECT COUNT(*) as total FROM products");
  const [catSummary] = await connection.query("SELECT category, COUNT(*) as cnt FROM products GROUP BY category");

  console.log("\n==================================================");
  console.log("🎉 PRISTINE DATABASE REBUILD COMPLETE");
  console.log("==================================================");
  console.log(`🛒 Total Clean Live Products in DB: ${finalDb[0].total}`);
  console.log("--------------------------------------------------");
  console.log("🏷️ LIVE CATEGORIES BREAKDOWN:");
  catSummary.forEach(c => console.log(`   - ${c.category}: ${c.cnt} products`));
  console.log("==================================================\n");

  await connection.end();
  process.exit(0);
}

masterRebuildCleanDbAndImages();
