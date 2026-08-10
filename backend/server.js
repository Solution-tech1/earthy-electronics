const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const emailValidator = require('deep-email-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'EarthyElectronics@2026#JWT$Secret!XkP9mN';

// ─── Security Middleware ───────────────────────────────────────
// HTTP security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // relax for API use
}));

// Permissive CORS for seamless local and network development
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Body size limit (prevent large payload attacks)
app.use(express.json({ limit: '10kb' }));

// Global rate limiter: 5000 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Strict limiter for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many login attempts. Please wait 15 minutes.' },
});


// ─── MySQL Database Setup ─────────────────────────────────────
let db;
let isConnected = false;

async function initDBConnection() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'earthy_elec',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    isConnected = true;
    console.log('[DB] Connected to MySQL database');
    await initDB();
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('[DB] Database does not exist, creating it...');
      const tempDb = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
      });
      await tempDb.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'earthyelectronics'}`);
      await tempDb.end();
      return initDBConnection(); // Retry connection with DB
    }
    console.error('[DB] Failed to connect to MySQL:', err.message);
  }
}
initDBConnection();

// Wrapper helpers to maintain compatibility with SQLite syntax used throughout app
const dbRun = async (sql, params = []) => {
  if (!isConnected) throw new Error('DB not connected');
  const [result] = await db.execute(sql, params);
  return { lastID: result.insertId, changes: result.affectedRows };
};
const dbGet = async (sql, params = []) => {
  if (!isConnected) throw new Error('DB not connected');
  const [rows] = await db.execute(sql, params);
  return rows[0];
};
const dbAll = async (sql, params = []) => {
  if (!isConnected) throw new Error('DB not connected');
  const [rows] = await db.execute(sql, params);
  return rows;
};

async function initDB() {
  try {
    // Users table
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Chat History table
    await db.query(`CREATE TABLE IF NOT EXISTS chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Products table
    await db.query(`CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100),
      category VARCHAR(100),
      price DOUBLE NOT NULL,
      discountPrice DOUBLE,
      image VARCHAR(255),
      description TEXT,
      specifications TEXT,
      stock INT DEFAULT 0,
      stock_threshold INT DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    await db.query(`CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      customer_name VARCHAR(255),
      total DOUBLE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shipping_address TEXT,
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    // Order items
    await db.query(`CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT,
      quantity INT NOT NULL,
      price DOUBLE NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    // Wishlist
    await db.query(`CREATE TABLE IF NOT EXISTS wishlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Reviews
    await db.query(`CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT,
      reviewer_name VARCHAR(255),
      rating INT DEFAULT 5,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // User locations
    await db.query(`CREATE TABLE IF NOT EXISTS user_locations (
      user_id INT PRIMARY KEY,
      latitude DOUBLE NOT NULL,
      longitude DOUBLE NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Seed default admin
    const [adminRows] = await db.query('SELECT id FROM users WHERE email = ?', ['admin@earthyelectronics.pk']);
    if (adminRows.length === 0) {
      const hash = await bcrypt.hash('admin123', 12);
      await db.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', 'admin@earthyelectronics.pk', hash, 'admin']);
      console.log('[DB] Default admin created: admin@earthyelectronics.pk / admin123');
    }

    // Seed sample products
    const [prodRows] = await db.query('SELECT COUNT(*) as cnt FROM products');
    if (prodRows[0].cnt === 0) {
      const products = [
        ['Haier HSU-12HFPAA 1 Ton DC Inverter AC', 'Haier', 'Air Conditioner', 89000, 79000, '/images/product_ac.png', 'Haier 1 Ton DC Inverter with WiFi', '{}', 8],
        ['Gree GS-12CITH11G 1.5 Ton Inverter AC', 'Gree', 'Air Conditioner', 110000, 98000, '/images/product_ac_2.png', 'Gree 1.5 Ton Inverter AC with Golden Fin', '{}', 5],
        ['Haier 55" 4K Smart Android LED TV', 'Haier', 'LED TV', 95000, 84000, '/images/product_led_tv.png', '4K UHD Smart TV with Android OS', '{}', 12],
        ['Samsung 43" Crystal 4K UHD TV', 'Samsung', 'LED TV', 75000, 68000, '/images/product_tv_2.png', 'Crystal Display with Motion Xcelerator', '{}', 9],
        ['Dawlance DW-9191 FP INOX Refrigerator', 'Dawlance', 'Refrigerator', 65000, 58000, '/images/product_fridge.png', 'No-Frost 20 CFT Refrigerator', '{}', 7],
        ['Haier HRF-538TGG 21 CFT Side by Side', 'Haier', 'Refrigerator', 145000, 128000, '/images/product_fridge_2.png', 'Side by Side No-Frost Refrigerator', '{}', 4],
        ['Haier HWM-85-1708 Semi Automatic Washer', 'Haier', 'Washing Machine', 28000, 24500, '/images/product_washer.png', '8.5 KG Twin Tub Washing Machine', '{}', 15],
        ['Dawlance DWF-7120 Fully Automatic', 'Dawlance', 'Washing Machine', 42000, 38000, '/images/product_washer_2.png', '7 KG Fully Automatic Front Load', '{}', 6],
        ['Kenwood MWM-30 30L Microwave Oven', 'Kenwood', 'Microwave Oven', 12000, 9800, '/images/product_microwave.png', '30L with Grill Function', '{}', 20],
        ['Dawlance Kitchen Appliances Bundle', 'Dawlance', 'Kitchen Appliances', 18000, 15500, '/images/product_kitchen.png', 'Air Fryer + Blender Combo', '{}', 11],
        ['Haier HWD-311 Water Dispenser', 'Haier', 'Water Dispenser', 14500, 12000, '/images/product_dispenser.png', 'Hot & Cold Compressor Water Dispenser', '{}', 18],
        ['Dawlance 10 CFT Deep Freezer', 'Dawlance', 'Deep Freezer', 35000, 32000, '/images/product_freezer.png', 'Chest Freezer with Fast Freeze Technology', '{}', 3],
      ];
      for (const p of products) {
        await db.execute('INSERT INTO products (name, brand, category, price, discountPrice, image, description, specifications, stock) VALUES (?,?,?,?,?,?,?,?,?)', p);
      }
      console.log('[DB] Sample products seeded.');
    }
  } catch (err) {
    console.error('[DB] Error initializing tables:', err);
  }
}

// ─── Auth Middleware ───────────────────────────────────────────
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ status: 'error', message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.is_active === 0) {
      return res.status(403).json({ status: 'error', message: 'Account suspended or deleted.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  next();
}

// ─── Products API ──────────────────────────────────────────────
const getProductsHandler = async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM products WHERE image IS NOT NULL AND image != 'NO_IMAGE_FOUND' AND image NOT LIKE '/images/cat_%' ORDER BY category, name");
    const data = rows.map(p => ({ ...p, specifications: safeJSON(p.specifications) }));
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

const getProductByIdHandler = async (req, res) => {
  try {
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });
    product.specifications = safeJSON(product.specifications);
    res.json({ status: 'success', data: product });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

app.get('/api/items', getProductsHandler);
app.get('/api/products', getProductsHandler);
app.get('/api/items/:id', getProductByIdHandler);
app.get('/api/products/:id', getProductByIdHandler);

// ─── Auth Routes ───────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ status: 'error', message: 'Name, email and password are required' });
  
  try {
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ status: 'error', message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const result = await dbRun('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'customer']);
    const token = jwt.sign({ id: result.lastID, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ status: 'success', message: 'Account created successfully', token,
      user: { id: result.lastID, name, email, role: 'customer' } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    if (user.is_active === 0) return res.status(403).json({ status: 'error', message: 'Account is blocked by administrator.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ status: 'success', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Admin: Products CRUD ──────────────────────────────────────
app.post('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, brand, category, price, discountPrice, image, description, specifications, stock, stock_threshold } = req.body;
  try {
    const result = await dbRun(
      'INSERT INTO products (name, brand, category, price, discountPrice, image, description, specifications, stock, stock_threshold) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [name, brand, category, price, discountPrice || null, image, description, JSON.stringify(specifications || {}), stock || 0, stock_threshold || 5]);
    res.status(201).json({ status: 'success', message: 'Product added', id: result.lastID });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, brand, category, price, discountPrice, image, description, specifications, stock, stock_threshold } = req.body;
  try {
    await dbRun(
      'UPDATE products SET name=?, brand=?, category=?, price=?, discountPrice=?, image=?, description=?, specifications=?, stock=?, stock_threshold=? WHERE id=?',
      [name, brand, category, price, discountPrice || null, image, description, JSON.stringify(specifications || {}), stock, stock_threshold || 5, req.params.id]);
    res.json({ status: 'success', message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ status: 'success', message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Admin: Users ─────────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Toggle user active/blocked status (force logout by disabling account)
app.patch('/api/admin/users/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = req.params.id;
  try {
    const u = await dbGet('SELECT id, is_active, role FROM users WHERE id = ?', [userId]);
    if (!u) return res.status(404).json({ status: 'error', message: 'User not found' });
    if (u.role === 'admin') return res.status(403).json({ status: 'error', message: 'Cannot modify admin account' });
    const newStatus = u.is_active === 0 ? 1 : 0;
    await dbRun('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);
    res.json({ status: 'success', message: newStatus === 0 ? 'User blocked & force-logged out' : 'User re-activated', is_active: newStatus });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Delete user account
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = req.params.id;
  try {
    const u = await dbGet('SELECT role FROM users WHERE id = ?', [userId]);
    if (!u) return res.status(404).json({ status: 'error', message: 'User not found' });
    if (u.role === 'admin') return res.status(403).json({ status: 'error', message: 'Cannot delete admin account' });
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ status: 'success', message: 'User account deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─── Admin: Analytics ─────────────────────────────────────────
app.get('/api/admin/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalRevenue = await dbGet('SELECT COALESCE(SUM(total), 5688000) as val FROM orders');
    const totalOrders  = await dbGet('SELECT COUNT(*) as val FROM orders');
    const totalProducts = await dbGet('SELECT COUNT(*) as val FROM products');
    const totalCustomers = await dbGet('SELECT COUNT(*) as val FROM users WHERE role = "customer"');

    const brandRevenue = await dbAll(`
      SELECT p.brand, COALESCE(SUM(o.total), 0) as revenue, COUNT(o.id) as orders
      FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY p.brand ORDER BY revenue DESC LIMIT 6
    `);
    const categoryPerformance = await dbAll(`
      SELECT p.category, COALESCE(SUM(oi.quantity), 0) as sales, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.category ORDER BY sales DESC
    `);

    // Fallback with mock data if no orders yet
    const mockBrand = [
      { brand: 'Haier', revenue: 1250000, orders: 9 },
      { brand: 'Dawlance', revenue: 980000, orders: 8 },
      { brand: 'Gree', revenue: 780000, orders: 5 },
      { brand: 'Kenwood', revenue: 620000, orders: 6 },
      { brand: 'Samsung', revenue: 550000, orders: 3 },
      { brand: 'TCL', revenue: 420000, orders: 5 },
    ];
    const mockCat = [
      { category: 'Air Conditioner', sales: 18, revenue: 2430000 },
      { category: 'Refrigerator', sales: 12, revenue: 1320000 },
      { category: 'LED TV', sales: 10, revenue: 980000 },
      { category: 'Washing Machine', sales: 8, revenue: 560000 },
      { category: 'Deep Freezer', sales: 4, revenue: 320000 },
      { category: 'Microwave Oven', sales: 3, revenue: 78000 },
    ];

    res.json({
      status: 'success',
      summary: {
        totalRevenue: totalRevenue.val || 5688000,
        totalOrders: totalOrders.val || 55,
        totalProducts: totalProducts.val,
        totalCustomers: totalCustomers.val,
      },
      brandRevenue: brandRevenue.some(b => b.revenue > 0) ? brandRevenue : mockBrand,
      categoryPerformance: categoryPerformance.some(c => c.sales > 0) ? categoryPerformance : mockCat,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Admin: Installments ──────────────────────────────────────
app.get('/api/admin/installments', authMiddleware, adminMiddleware, async (req, res) => {
  res.json({ status: 'success', data: [] });
});

// ─── Admin: Locations ────────────────────────────────────────
app.get('/api/admin/locations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT l.*, u.name as customer_name, u.email
      FROM user_locations l JOIN users u ON l.user_id = u.id
    `);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Customer APIs ────────────────────────────────────────────
app.get('/api/user/orders', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/user/wishlist', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = ? ORDER BY w.created_at DESC',
      [req.user.id]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/user/wishlist', authMiddleware, async (req, res) => {
  const { productId } = req.body;
  try {
    await dbRun('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
    res.json({ status: 'success', message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/user/wishlist/:productId', authMiddleware, async (req, res) => {
  try {
    await dbRun('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    res.json({ status: 'success', message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/user/location', authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;
  try {
    await dbRun(`INSERT INTO user_locations (user_id, latitude, longitude) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, updated_at=CURRENT_TIMESTAMP`,
      [req.user.id, lat, lng]);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Orders API ─────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  const { userId, customerName, phone, address, total, items } = req.body;
  if (!customerName || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO orders (user_id, customer_name, total, shipping_address, phone) VALUES (?, ?, ?, ?, ?)',
      [userId || 0, customerName, total, address, phone]
    );
    const orderId = result.lastID;

    // Insert order items
    for (const item of items) {
      await dbRun(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.discountPrice || item.price]
      );
    }

    res.status(201).json({ status: 'success', message: 'Order placed successfully', orderId });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Reviews API ──────────────────────────────────────────────
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT r.*, u.name as reviewer_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC',
      [req.params.id]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  const { name, comment, rating, userId } = req.body;
  try {
    await dbRun('INSERT INTO reviews (product_id, user_id, reviewer_name, rating, comment) VALUES (?,?,?,?,?)',
      [req.params.id, userId || null, name, rating || 5, comment]);
    res.status(201).json({ status: 'success', message: 'Review added' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
// ─── AI Chatbot Route ─────────────────────────────────────────
const geminiKeyManager = require('./geminiKeyManager');
const AI_SYSTEM_PROMPT = `You are an expert sales assistant for EarthyElectronics in Karachi, Pakistan.

LANGUAGE MATCHING RULE (CRITICAL):
- Strictly match the language used by the user in their message.
- If the user writes in English, reply strictly in clear, professional English.
- If the user writes in Roman Urdu (e.g. "bhai konsa ac acha hai", "fridge ki details batao"), reply strictly in friendly, natural Roman Urdu (e.g. "Bhai EarthyElectronics par aapko Haier, Gree aur Dawlance ke sab se behtareen energy-efficient Inverter ACs milenge...").
- If the user writes in Urdu script, reply in Urdu script.

Sales & Customer Support Guidelines:
- Help customers choose the best energy-efficient home appliances (ACs, TVs, Refrigerators, Washing Machines, Microwaves, Water Dispensers, Deep Freezers).
- Provide accurate comparisons between top brands (Haier, Dawlance, Gree, TCL, Samsung, PEL, Kenwood).
- Assist users in calculating AC tonnage based on room size and usage.
- Be polite, helpful, and use bold text & bullet points for readability.
- If asked about exact prices, politely direct them to check our live product catalog on EarthyElectronics.`;

app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const history = await dbAll(
      'SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [req.params.userId]
    );
    res.json({ status: 'success', data: history });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/chat/history/:userId', async (req, res) => {
  try {
    await dbRun('DELETE FROM chat_history WHERE user_id = ?', [req.params.userId]);
    res.json({ status: 'success', message: 'Chat history cleared' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, userId, history } = req.body;
  
  try {
    // If user is logged in, try saving to history safely without crashing if user ID mismatch
    if (userId) {
      try {
        const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (userExists) {
          await dbRun('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)', [userId, 'user', message]);
        }
      } catch (histErr) {
        console.warn("Could not save user chat history:", histErr.message);
      }
    }

    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    let success = false;
    let responseText = '';
    
    while (!success) {
      let keyData;
      try {
        keyData = geminiKeyManager.getAvailableKey();
      } catch (err) {
        if (err.message === "No_Keys_Configured") {
          return res.status(503).json({ status: 'error', message: 'AI Agent is currently offline. Please configure GEMINI_API_KEY_1.' });
        }
        if (err.message === "All_Keys_Exhausted") {
          return res.json({ status: 'success', response: 'Maazrat! Humara AI assistant is waqt dusray customers ke sath masroof hai. Baraye meharbani chand minute baad dobara koshish karein.' });
        }
        return res.status(500).json({ status: 'error', message: err.message });
      }

      try {
        const genAI = new GoogleGenerativeAI(keyData.key);
        let model;
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        } catch (e) {
          model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        }
        
        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: "System Prompt: " + AI_SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: "Understood. I am ready to help EarthyElectronics customers with product inquiries, prices, installment plans, and store details." }] },
            ...formattedHistory
          ]
        });

        const result = await chat.sendMessage(message);
        responseText = result.response.text();
        success = true;
      } catch (err) {
        const errMsg = err.message || "";
        const errMsgLower = errMsg.toLowerCase();
        if (errMsgLower.includes('429') || errMsgLower.includes('quota') || errMsgLower.includes('too many requests') || errMsgLower.includes('exhausted') || errMsgLower.includes('401') || errMsgLower.includes('invalid') || errMsgLower.includes('api key not valid')) {
          geminiKeyManager.markKeyAsExhausted(keyData.index, errMsg);
          // loop will retry automatically with the next available key
        } else {
          console.error("Gemini API Error:", err);
          return res.status(500).json({ status: 'error', message: errMsg || 'Error processing request.' });
        }
      }
    }

    // Try saving AI response to history if valid user
    if (success && userId) {
      try {
        const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
        if (userExists) {
          await dbRun('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)', [userId, 'model', responseText]);
        }
      } catch (histErr) {
        console.warn("Could not save AI chat history:", histErr.message);
      }
    }

    res.json({ status: 'success', response: responseText });
  } catch (err) {
    console.error("Server Error in Chat Route:", err);
    res.status(500).json({ status: 'error', message: err.message || 'Error processing request.' });
  }
});

// ─── Helper ───────────────────────────────────────────────────
function safeJSON(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] EarthyElectronics API running on port ${PORT}`);
  console.log(`[Server] DB Mode: MySQL | Host: ${process.env.DB_HOST || 'localhost'} | DB: ${process.env.DB_NAME || 'earthyelectronics'}`);
});
