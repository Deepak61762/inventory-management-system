const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Anyone logged in (ADMIN or STAFF) can view products
router.get('/', verifyToken, getAllProducts);
router.get('/low-stock', verifyToken, getLowStockProducts);
router.get('/:id', verifyToken, getProductById);

// Only ADMIN can create, edit, or delete products
router.post('/', verifyToken, requireAdmin, createProduct);
router.put('/:id', verifyToken, requireAdmin, updateProduct);
router.delete('/:id', verifyToken, requireAdmin, deleteProduct);

module.exports = router;
