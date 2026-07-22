const db = require('../db/connection');

// POST /api/stock/transaction
// Body: { product_id, type: "IN" | "OUT", quantity, note }
//
// This does TWO things that must both succeed or both fail together:
//   1. Insert a row into stock_transactions (the audit history)
//   2. Update the product's quantity (increase for IN, decrease for OUT)
//
// We use a DB transaction (getConnection + beginTransaction) so that if
// step 2 fails after step 1 succeeded, we can roll back step 1 too -
// otherwise we'd end up with a history log that doesn't match real stock.
const recordTransaction = async (req, res) => {
  const { product_id, type, quantity, note } = req.body;
  const user_id = req.user.id; // set by verifyToken middleware

  if (!product_id || !type || quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'product_id, type, and quantity are required' });
  }
  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ error: 'type must be IN or OUT' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be positive' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the product row so no other request can change its quantity
    // at the same time (prevents a race condition on stock counts).
    // We also grab the current price here - this becomes the unit_price
    // stored on the transaction, so revenue stays accurate to what the
    // price actually was at this moment, even if it changes later.
    const [productRows] = await connection.query(
      'SELECT quantity, price FROM products WHERE id = ? FOR UPDATE',
      [product_id]
    );

    if (productRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentQuantity = productRows[0].quantity;
    const unitPrice = productRows[0].price;

    if (type === 'OUT' && currentQuantity < quantity) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    const newQuantity = type === 'IN'
      ? currentQuantity + quantity
      : currentQuantity - quantity;

    await connection.query('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, product_id]);

    await connection.query(
      `INSERT INTO stock_transactions (product_id, user_id, type, quantity, unit_price, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, user_id, type, quantity, unitPrice, note || null]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      message: 'Transaction recorded',
      new_quantity: newQuantity,
      line_value: (unitPrice * quantity).toFixed(2)
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error(err);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
};

// GET /api/stock/history/:productId
const getProductHistory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT st.*, u.username,
              (st.quantity * st.unit_price) AS line_total
       FROM stock_transactions st
       JOIN users u ON st.user_id = u.id
       WHERE st.product_id = ?
       ORDER BY st.created_at DESC`,
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// GET /api/stock/revenue-summary
// Totals up money "in" (stock OUT = sales/revenue) and money "out"
// (stock IN = purchases/restocking cost) across every product.
// Only transactions with a recorded unit_price count towards these totals -
// older transactions from before this feature existed are excluded rather
// than guessed at.
const getRevenueSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT type, SUM(quantity * unit_price) AS total
      FROM stock_transactions
      WHERE unit_price IS NOT NULL
      GROUP BY type
    `);

    const summary = { totalSalesRevenue: 0, totalRestockCost: 0 };
    rows.forEach(row => {
      if (row.type === 'OUT') summary.totalSalesRevenue = parseFloat(row.total) || 0;
      if (row.type === 'IN') summary.totalRestockCost = parseFloat(row.total) || 0;
    });
    summary.netRevenue = summary.totalSalesRevenue - summary.totalRestockCost;

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch revenue summary' });
  }
};

module.exports = { recordTransaction, getProductHistory, getRevenueSummary };
