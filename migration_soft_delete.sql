-- Run this against your EXISTING inventory_db to add soft-delete support
-- for user accounts, without losing any existing data.

USE inventory_db;

ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;
