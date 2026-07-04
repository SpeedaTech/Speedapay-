const WalletTransaction = require('../models/WalletTransaction');
const Wallet = require('../models/Wallet');
const WalletLimit = require('../models/WalletLimit');
const WalletActivityLog = require('../models/WalletActivityLog');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TransactionService {
  /**
   * Create a transaction (internal method, used by other services)
   */
  static async createTransaction(transactionData) {
    try {
      // Check for duplicate using reference ID (idempotency)
      if (transactionData.reference_id) {
        const existing = await WalletTransaction.findByReference(transactionData.reference_id);
        if (existing) {
          logger.info(`Transaction with reference ${transactionData.reference_id} already exists`);
          return existing;
        }
      }

      // Generate reference ID if not provided
      if (!transactionData.reference_id) {
        transactionData.reference_id = `txn_${uuidv4()}`;
      }

      // Create transaction
      const transaction = await WalletTransaction.create(transactionData);

      logger.info(`Created transaction ${transaction.id} of type ${transactionData.transaction_type}`);
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(walletId, limit = 50, offset = 0, status = null) {
    try {
      const transactions = await WalletTransaction.findByWallet(
        walletId,
        limit,
        offset,
        status
      );
      return transactions;
    } catch (error) {
      logger.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Complete a transaction (change status to completed)
   */
  static async completeTransaction(transactionId) {
    try {
      const transaction = await WalletTransaction.findById(transactionId);
      if (!transaction) {
        throw {
          statusCode: 404,
          message: 'Transaction not found',
        };
      }

      // Update status
      const result = await WalletTransaction.updateStatus(transactionId, 'completed');

      // Log activity
      await WalletActivityLog.create({
        wallet_id: transaction.wallet_id,
        user_id: transaction.user_id,
        activity_type: 'transaction_completed',
        new_value: { status: 'completed', amount: transaction.amount },
        reason: `Transaction ${transactionId} completed`,
      });

      logger.info(`Completed transaction ${transactionId}`);
      return result;
    } catch (error) {
      logger.error('Error completing transaction:', error);
      throw error;
    }
  }

  /**
   * Fail a transaction
   */
  static async failTransaction(transactionId, reason) {
    try {
      const transaction = await WalletTransaction.findById(transactionId);
      if (!transaction) {
        throw {
          statusCode: 404,
          message: 'Transaction not found',
        };
      }

      // Update status
      const result = await WalletTransaction.updateStatus(transactionId, 'failed');

      // Log activity
      await WalletActivityLog.create({
        wallet_id: transaction.wallet_id,
        user_id: transaction.user_id,
        activity_type: 'transaction_failed',
        new_value: { status: 'failed', reason },
        reason: reason || 'Transaction failed',
      });

      logger.info(`Failed transaction ${transactionId}: ${reason}`);
      return result;
    } catch (error) {
      logger.error('Error failing transaction:', error);
      throw error;
    }
  }
}

module.exports = TransactionService;
