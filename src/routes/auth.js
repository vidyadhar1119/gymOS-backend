const express = require('express');
const router = express.Router();
const { registerGym, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes (no token needed)
router.post('/register', registerGym);
router.post('/login', login);

// Protected route (token required)
router.get('/me', protect, getMe);

module.exports = router;
