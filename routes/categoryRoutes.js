const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory, deleteCategory } = require('../controllers/categoryController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getAllCategories);
router.post('/', verifyToken, requireAdmin, createCategory);
router.delete('/:id', verifyToken, requireAdmin, deleteCategory);

module.exports = router;
