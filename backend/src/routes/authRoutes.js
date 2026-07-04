const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validatePhoneNumber, validateOTP, handleValidationErrors } = require('../utils/validation');
const { otpRequestLimiter, loginLimiter } = require('../middleware/rateLimit');

// Public routes
router.post('/request-otp', otpRequestLimiter, validatePhoneNumber, handleValidationErrors, AuthController.requestOTP);

router.post('/register', loginLimiter, AuthController.registerWithOTP);

router.post('/login', loginLimiter, AuthController.loginWithOTP);

// Protected routes
router.get('/me', authMiddleware, AuthController.getCurrentUser);

router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
