const express = require('express');
const router = express.Router();
const { getAllSuppliers, createSupplier, deleteSupplier } = require('../controllers/supplierController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getAllSuppliers);
router.post('/', verifyToken, requireAdmin, createSupplier);
router.delete('/:id', verifyToken, requireAdmin, deleteSupplier);

module.exports = router;
