const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const WalletLimit = require('../models/WalletLimit');
const WalletHold = require('../models/WalletHold');
const WalletActivityLog = require('../models/WalletActivityLog');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class WalletService {
  /**
   * Create wallets for a new user (called after user registration)
   */
  static async createUserWallets(userId) {
    try {
      const currencies = ['USD', 'LRD'];
      const wallets = [];

      for (const currency of currencies) {
        const wallet = await Wallet.create({
          user_id: userId,
          currency,
          status: 'active',
        });

        // Create limit tracking for wallet
        await WalletLimit.create({
          wallet_id: wallet.id,
        });

        wallets.push(wallet);
      }

      logger.info(`Created wallets for user ${userId}`);
      return wallets;
    } catch (error) {
      logger.error('Error creating user wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallet with calculated balance
   */
  static async getWallet(walletId) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw {
          statusCode: 404,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        };
      }

      // Recalculate balance from transactions
      const balance = await this.calculateBalance(walletId);
      wallet.available_balance = balance.available;
      wallet.pending_balance = balance.pending;
      wallet.frozen_balance = balance.frozen;
      wallet.total_balance = balance.total;

      return wallet;
    } catch (error) {
      logger.error('Error getting wallet:', error);
      throw error;
    }
  }

  /**
   * Get all wallets for a user
   */
  static async getUserWallets(userId) {
    try {
      const wallets = await Wallet.findAllByUser(userId);

      // Recalculate balances for all wallets
      const enrichedWallets = await Promise.all(
        wallets.map(async (wallet) => {
          const balance = await this.calculateBalance(wallet.id);
          return {
            ...wallet,
            available_balance: balance.available,
            pending_balance: balance.pending,
            frozen_balance: balance.frozen,
            total_balance: balance.total,
          };
        })
      );

      return enrichedWallets;
    } catch (error) {
      logger.error('Error getting user wallets:', error);
      throw error;
    }
  }

  /**
   * Calculate balance from transaction ledger
   * CRITICAL: Balance is NEVER stored, always calculated from immutable ledger
   */
  static async calculateBalance(walletId) {
    try {
      // Get all completed transactions
      const completedTransactions = await WalletTransaction.getCompletedTransactions(walletId);
      const availableBalance = completedTransactions.reduce(
        (sum, txn) => sum + parseFloat(txn.amount),
        0
      );

      // Get all pending transactions
      const pendingTransactions = await WalletTransaction.getPendingTransactions(walletId);
      const pendingBalance = pendingTransactions.reduce(
        (sum, txn) => sum + parseFloat(txn.amount),
        0
      );

      // Get all holds
      const holds = await WalletHold.findActiveHolds(walletId);
      const frozenBalance = holds.reduce(
        (sum, hold) => sum + parseFloat(hold.amount),
        0
      );

      return {
        available: parseFloat(availableBalance.toFixed(2)),
        pending: parseFloat(pendingBalance.toFixed(2)),
        frozen: parseFloat(frozenBalance.toFixed(2)),
        total: parseFloat((availableBalance + pendingBalance + frozenBalance).toFixed(2)),
      };
    } catch (error) {
      logger.error('Error calculating balance:', error);
      throw error;
    }
  }

  /**
   * Check if transaction respects wallet limits
   */
  static async checkLimits(walletId, amount, direction = 'send') {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw {
          statusCode: 404,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        };
      }

      // Get limit tracking
      const limits = await WalletLimit.findByWallet(walletId);

      if (direction === 'send') {
        // Check daily limit
        if (limits.daily_sent_amount + amount > wallet.daily_send_limit) {
          throw {
            statusCode: 400,
            message: `Daily send limit exceeded. Limit: ${wallet.daily_send_limit}, Already sent: ${limits.daily_sent_amount}`,
            code: 'DAILY_LIMIT_EXCEEDED',
          };
        }

        // Check monthly limit
        if (limits.monthly_sent_amount + amount > wallet.monthly_send_limit) {
          throw {
            statusCode: 400,
            message: `Monthly send limit exceeded`,
            code: 'MONTHLY_LIMIT_EXCEEDED',
          };
        }
      } else if (direction === 'receive') {
        // Check daily receive limit
        if (limits.daily_received_amount + amount > wallet.daily_receive_limit) {
          throw {
            statusCode: 400,
            message: 'Daily receive limit exceeded',
            code: 'DAILY_RECEIVE_LIMIT_EXCEEDED',
          };
        }

        // Check monthly receive limit
        if (limits.monthly_received_amount + amount > wallet.monthly_receive_limit) {
          throw {
            statusCode: 400,
            message: 'Monthly receive limit exceeded',
            code: 'MONTHLY_RECEIVE_LIMIT_EXCEEDED',
          };
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking limits:', error);
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  static async checkSufficientBalance(walletId, amount) {
    try {
      const balance = await this.calculateBalance(walletId);

      if (balance.available < amount) {
        throw {
          statusCode: 400,
          message: `Insufficient balance. Available: ${balance.available}, Required: ${amount}`,
          code: 'INSUFFICIENT_BALANCE',
        };
      }

      return true;
    } catch (error) {
      logger.error('Error checking balance:', error);
      throw error;
    }
  }

  /**
   * Place a hold on wallet amount
   */
  static async placeHold(walletId, userId, amount, reason = null) {
    try {
      // First check balance
      await this.checkSufficientBalance(walletId, amount);

      // Create hold
      const hold = await WalletHold.create({
        wallet_id: walletId,
        user_id: userId,
        amount,
        reason,
      });

      logger.info(`Placed hold on wallet ${walletId} for amount ${amount}`);
      return hold;
    } catch (error) {
      logger.error('Error placing hold:', error);
      throw error;
    }
  }

  /**
   * Release a hold
   */
  static async releaseHold(holdId) {
    try {
      const result = await WalletHold.release(holdId);
      logger.info(`Released hold ${holdId}`);
      return result;
    } catch (error) {
      logger.error('Error releasing hold:', error);
      throw error;
    }
  }

  /**
   * Freeze wallet (admin action)
   */
  static async freezeWallet(walletId, reason) {
    try {
      const result = await Wallet.updateStatus(walletId, 'frozen', reason);
      logger.warn(`Wallet ${walletId} frozen. Reason: ${reason}`);
      return result;
    } catch (error) {
      logger.error('Error freezing wallet:', error);
      throw error;
    }
  }

  /**
   * Unfreeze wallet (admin action)
   */
  static async unfreezeWallet(walletId) {
    try {
      const result = await Wallet.updateStatus(walletId, 'active', 'Unfrozen by admin');
      logger.info(`Wallet ${walletId} unfrozen`);
      return result;
    } catch (error) {
      logger.error('Error unfreezing wallet:', error);
      throw error;
    }
  }

  /**
   * Update wallet limits (admin action)
   */
  static async updateLimits(walletId, limits) {
    try {
      const result = await Wallet.updateLimits(walletId, limits);
      logger.info(`Updated limits for wallet ${walletId}`);
      return result;
    } catch (error) {
      logger.error('Error updating limits:', error);
      throw error;
    }
  }

  /**
   * Reconcile wallet balance (verify against ledger)
   */
  static async reconcileBalance(walletId) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw {
          statusCode: 404,
          message: 'Wallet not found',
        };
      }

      // Calculate actual balance from ledger
      const calculatedBalance = await this.calculateBalance(walletId);

      // Compare with stored balance
      const discrepancies = {
        available: wallet.available_balance - calculatedBalance.available,
        pending: wallet.pending_balance - calculatedBalance.pending,
        frozen: wallet.frozen_balance - calculatedBalance.frozen,
      };

      // Update wallet if discrepancy found
      if (Object.values(discrepancies).some(v => v !== 0)) {
        await Wallet.updateBalance(walletId, calculatedBalance);

        logger.warn(`Balance reconciliation for wallet ${walletId}:`, discrepancies);
      }

      return {
        old_balance: wallet.total_balance,
        new_balance: calculatedBalance.total,
        discrepancies: Object.values(discrepancies).some(v => v !== 0),
      };
    } catch (error) {
      logger.error('Error reconciling balance:', error);
      throw error;
    }
  }
}

module.exports = WalletService;
