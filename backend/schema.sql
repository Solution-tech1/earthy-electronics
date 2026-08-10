-- ============================================================
-- Bismillah Electronics - MySQL Database Schema
-- Run this once on your MySQL server to create all tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS bismillah_elec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bismillah_elec;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin', 'customer') DEFAULT 'customer',
  phone       VARCHAR(20),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  brand           VARCHAR(100),
  category        VARCHAR(100),
  price           DECIMAL(12, 2) NOT NULL,
  discountPrice   DECIMAL(12, 2),
  image           VARCHAR(255),
  description     TEXT,
  specifications  JSON,
  stock           INT DEFAULT 0,
  stock_threshold INT DEFAULT 5,
  is_hot          TINYINT(1) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Order Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Wishlist Table (User "Stock")
CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist (user_id, product_id)
);

-- User Live Locations Table
CREATE TABLE IF NOT EXISTS user_locations (
  user_id INT PRIMARY KEY,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  user_id     INT,
  reviewer_name VARCHAR(100),
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Installment Ledger ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_ledger (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT,
  product_id      INT,
  product_name    VARCHAR(255),
  total_amount    DECIMAL(12, 2) NOT NULL,
  down_payment    DECIMAL(12, 2) NOT NULL,
  monthly_amount  DECIMAL(12, 2) NOT NULL,
  total_months    INT NOT NULL,
  paid_months     INT DEFAULT 0,
  next_due_date   DATE,
  status          ENUM('active','completed','defaulted') DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ── Default Admin User (password: admin123) ───────────────────
-- Note: password hash is for 'admin123' with bcrypt 12 rounds
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Admin', 'admin@bismillah.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGqbMILFxQb4UsTJkO0LrV7VkE2', 'admin');
