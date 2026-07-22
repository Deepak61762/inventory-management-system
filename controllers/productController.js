const db = require('../db/connection');

// GET /api/products
// Returns all products, with category and supplier names joined in
// (instead of just their ids) so the frontend doesn't need extra requests.
const getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name, p.sku, p.price, p.quantity, p.reorder_level,
             c.name AS category_name, s.name AS supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// GET /api/products/low-stock
// Products where quantity has dropped below their reorder_level
const getLowStockProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE quantity < reorder_level'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  const { name, sku, category_id, supplier_id, price, quantity, reorder_level } = req.body;

  if (!name || !sku || !price) {
    return res.status(400).json({ error: 'name, sku, and price are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO products (name, sku, category_id, supplier_id, price, quantity, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category_id || null, supplier_id || null, price, quantity || 0, reorder_level || 10]
    );
    res.status(201).json({ id: result.insertId, message: 'Product created' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  const { name, sku, category_id, supplier_id, price, reorder_level } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE products
       SET name = ?, sku = ?, category_id = ?, supplier_id = ?, price = ?, reorder_level = ?
       WHERE id = ?`,
      [name, sku, category_id || null, supplier_id || null, price, reorder_level, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete: this product has stock transaction history' });
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  getAllProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
