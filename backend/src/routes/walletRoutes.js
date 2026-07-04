const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');

// All wallet routes require authentication
router.use(authMiddleware);

// Get all user wallets
router.get('/', WalletController.getAllWallets);

// Get specific wallet by currency
router.get('/:currency', WalletController.getWallet);

// Get wallet transactions
router.get('/:currency/transactions', WalletController.getTransactions);

module.exports = router;
