const express = require('express');
const router = express.Router();
const { recordTransaction, getProductHistory, getRevenueSummary } = require('../controllers/stockController');
const { verifyToken } = require('../middleware/authMiddleware');

// Both ADMIN and STAFF can record stock movements and view history
router.post('/transaction', verifyToken, recordTransaction);
router.get('/history/:productId', verifyToken, getProductHistory);
router.get('/revenue-summary', verifyToken, getRevenueSummary);

module.exports = router;
