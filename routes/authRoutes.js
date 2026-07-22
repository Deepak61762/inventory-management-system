const express = require('express');
const router = express.Router();
const { register, login, getLoginHistory, clearLoginHistory, getAllUsers, adminResetPassword, deactivateUser, reactivateUser } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/login-history', verifyToken, requireAdmin, getLoginHistory);
router.delete('/login-history', verifyToken, requireAdmin, clearLoginHistory);
router.get('/users', verifyToken, requireAdmin, getAllUsers);
router.put('/users/:id/reset-password', verifyToken, requireAdmin, adminResetPassword);
router.put('/users/:id/deactivate', verifyToken, requireAdmin, deactivateUser);
router.put('/users/:id/reactivate', verifyToken, requireAdmin, reactivateUser);

module.exports = router;
