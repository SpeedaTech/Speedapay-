const WalletService = require('../services/walletService');
const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');

class WalletController {
  /**
   * Get wallet by currency
   */
  static async getWallet(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currency } = req.params;

      const Wallet = require('../models/Wallet');
      const wallet = await Wallet.findByUserAndCurrency(userId, currency);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Recalculate balance
      const walletWithBalance = await WalletService.getWallet(wallet.id);

      res.status(200).json({
        success: true,
        data: walletWithBalance,
      });
    } catch (error) {
      logger.error('Error in getWallet:', error);
      next(error);
    }
  }

  /**
   * Get all wallets for user
   */
  static async getAllWallets(req, res, next) {
    try {
      const userId = req.user.userId;
      const wallets = await WalletService.getUserWallets(userId);

      res.status(200).json({
        success: true,
        data: wallets,
      });
    } catch (error) {
      logger.error('Error in getAllWallets:', error);
      next(error);
    }
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currency } = req.params;
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const status = req.query.status || null;

      const Wallet = require('../models/Wallet');
      const wallet = await Wallet.findByUserAndCurrency(userId, currency);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
        });
      }

      const TransactionService = require('../services/transactionService');
      const transactions = await TransactionService.getTransactionHistory(
        wallet.id,
        limit,
        offset,
        status
      );

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      next(error);
    }
  }
}

module.exports = WalletController;
