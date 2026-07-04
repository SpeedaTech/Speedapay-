const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { validatePIN, handleValidationErrors } = require('../utils/validation');

// All user routes require authentication
router.use(authMiddleware);

router.patch('/profile', UserController.updateProfile);

router.post('/set-pin', validatePIN, handleValidationErrors, UserController.setPin);

router.get('/audit-logs', UserController.getAuditLogs);

module.exports = router;
