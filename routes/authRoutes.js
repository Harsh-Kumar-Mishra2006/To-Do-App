//authRoutes.js
const express = require('express');
const router = express.Router();
const {
  Signup,
  Login,
  getProfile,
  logout
} = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ✅ FIXED: Signup should NOT require authentication
router.post('/signup', Signup);  // ✅ Removed authenticateToken
router.post('/login', Login);
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', logout);  // ✅ Changed to POST

module.exports = router;