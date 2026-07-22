-- Run this in MySQL Workbench to create the database and tables

CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN','STAFF') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    phone VARCHAR(20)
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT,
    supplier_id INT,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE stock_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('IN','OUT') NOT NULL,
    quantity INT NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sample data to get started
INSERT INTO categories (name) VALUES ('Electronics'), ('Stationery'), ('Furniture');

INSERT INTO suppliers (name, contact_email, phone) VALUES
('Acme Supplies', 'acme@example.com', '1234567890'),
('Global Traders', 'global@example.com', '9876543210');

INSERT INTO products (name, sku, category_id, supplier_id, price, quantity, reorder_level) VALUES
('Wireless Mouse', 'SKU001', 1, 1, 599.00, 50, 10),
('Notebook A5', 'SKU002', 2, 2, 49.00, 200, 30),
('Office Chair', 'SKU003', 3, 2, 3499.00, 8, 5);


USE inventory_db;
SELECT id, username, role, created_at FROM users;

USE inventory_db;
SHOW TABLES;