const db = require('../db/connection');

const getAllSuppliers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliers ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

const createSupplier = async (req, res) => {
  const { name, contact_email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const [result] = await db.query(
      'INSERT INTO suppliers (name, contact_email, phone) VALUES (?, ?, ?)',
      [name, contact_email || null, phone || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Supplier created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Cannot delete: products are still assigned to this supplier' });
    }
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

module.exports = { getAllSuppliers, createSupplier, deleteSupplier };
