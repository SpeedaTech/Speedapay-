const pool = require('../config/database');
const logger = require('../utils/logger');

class WalletTransaction {
  static async create(transactionData) {
    const query = `
      INSERT INTO wallet_transactions (
        wallet_id, user_id, transaction_type, amount, currency,
        from_user_id, to_user_id, from_wallet_id, to_wallet_id,
        status, reference_id, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, wallet_id, user_id, transaction_type, amount, currency,
                from_user_id, to_user_id, status, reference_id, created_at
    `;
    try {
      const result = await pool.query(query, [
        transactionData.wallet_id,
        transactionData.user_id,
        transactionData.transaction_type,
        transactionData.amount,
        transactionData.currency,
        transactionData.from_user_id || null,
        transactionData.to_user_id || null,
        transactionData.from_wallet_id || null,
        transactionData.to_wallet_id || null,
        transactionData.status || 'pending',
        transactionData.reference_id,
        transactionData.description || null,
        transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  static async findById(transactionId) {
    const query = `
      SELECT id, wallet_id, user_id, transaction_type, amount, currency,
             from_user_id, to_user_id, from_wallet_id, to_wallet_id,
             status, reference_id, description, metadata, reconciled,
             created_at, completed_at, failed_at
      FROM wallet_transactions WHERE id = $1
    `;
    try {
      const result = await pool.query(query, [transactionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction:', error);
      throw error;
    }
  }

  static async findByReference(referenceId) {
    const query = `
      SELECT id, wallet_id, user_id, transaction_type, amount, currency,
             from_user_id, to_user_id, status, reference_id, created_at
      FROM wallet_transactions WHERE reference_id = $1
    `;
    try {
      const result = await pool.query(query, [referenceId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by reference:', error);
      throw error;
    }
  }

  static async findByWallet(walletId, limit = 50, offset = 0, status = null) {
    let query = `
      SELECT id, wallet_id, user_id, transaction_type, amount, currency,
             from_user_id, to_user_id, status, reference_id, description,
             created_at, completed_at
      FROM wallet_transactions
      WHERE wallet_id = $1
    `;
    const params = [walletId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount += 1;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding wallet transactions:', error);
      throw error;
    }
  }

  static async updateStatus(transactionId, status) {
    const query = `
      UPDATE wallet_transactions
      SET status = $1,
          completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
          failed_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE failed_at END
      WHERE id = $2
      RETURNING id, status, completed_at
    `;
    try {
      const result = await pool.query(query, [status, transactionId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  static async getCompletedTransactions(walletId) {
    const query = `
      SELECT id, amount, currency, created_at
      FROM wallet_transactions
      WHERE wallet_id = $1 AND status = 'completed'
      ORDER BY created_at ASC
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching completed transactions:', error);
      throw error;
    }
  }

  static async getPendingTransactions(walletId) {
    const query = `
      SELECT id, amount, currency, created_at
      FROM wallet_transactions
      WHERE wallet_id = $1 AND status = 'pending'
      ORDER BY created_at ASC
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending transactions:', error);
      throw error;
    }
  }
}

module.exports = WalletTransaction;
