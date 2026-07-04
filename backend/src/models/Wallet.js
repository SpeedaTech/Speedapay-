const pool = require('../config/database');
const logger = require('../utils/logger');

class Wallet {
  static async create(walletData) {
    const query = `
      INSERT INTO wallets (
        user_id, currency, status,
        daily_send_limit, monthly_send_limit,
        daily_receive_limit, monthly_receive_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, currency, available_balance, pending_balance,
                frozen_balance, total_balance, status, created_at
    `;
    try {
      const result = await pool.query(query, [
        walletData.user_id,
        walletData.currency,
        walletData.status || 'active',
        walletData.daily_send_limit || 5000.00,
        walletData.monthly_send_limit || 50000.00,
        walletData.daily_receive_limit || 50000.00,
        walletData.monthly_receive_limit || 500000.00,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  static async findById(walletId) {
    const query = `
      SELECT id, user_id, currency, available_balance, pending_balance,
             frozen_balance, total_balance, status, daily_send_limit,
             monthly_send_limit, daily_receive_limit, monthly_receive_limit,
             balance_updated_at, created_at, updated_at
      FROM wallets WHERE id = $1
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding wallet by ID:', error);
      throw error;
    }
  }

  static async findByUserAndCurrency(userId, currency) {
    const query = `
      SELECT id, user_id, currency, available_balance, pending_balance,
             frozen_balance, total_balance, status, daily_send_limit,
             monthly_send_limit, daily_receive_limit, monthly_receive_limit,
             balance_updated_at, created_at, updated_at
      FROM wallets WHERE user_id = $1 AND currency = $2
    `;
    try {
      const result = await pool.query(query, [userId, currency]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding wallet:', error);
      throw error;
    }
  }

  static async findAllByUser(userId) {
    const query = `
      SELECT id, user_id, currency, available_balance, pending_balance,
             frozen_balance, total_balance, status, daily_send_limit,
             monthly_send_limit, daily_receive_limit, monthly_receive_limit,
             balance_updated_at, created_at, updated_at
      FROM wallets WHERE user_id = $1 AND status != 'closed'
      ORDER BY currency ASC
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding user wallets:', error);
      throw error;
    }
  }

  static async updateBalance(walletId, balances) {
    const query = `
      UPDATE wallets
      SET available_balance = $1,
          pending_balance = $2,
          frozen_balance = $3,
          total_balance = $4,
          balance_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, available_balance, pending_balance, frozen_balance, total_balance
    `;
    try {
      const result = await pool.query(query, [
        balances.available,
        balances.pending,
        balances.frozen,
        balances.total,
        walletId,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  static async updateStatus(walletId, status, reason = null) {
    const query = `
      UPDATE wallets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, status
    `;
    try {
      const result = await pool.query(query, [status, walletId]);
      if (result.rows[0]) {
        // Log to activity log
        const logQuery = `
          INSERT INTO wallet_activity_logs (wallet_id, user_id, activity_type, old_value, new_value, reason)
          SELECT id, user_id, 'status_change', $1::jsonb, $2::jsonb, $3
          FROM wallets WHERE id = $4
        `;
        await pool.query(logQuery, [
          JSON.stringify({ status: 'previous' }),
          JSON.stringify({ status }),
          reason,
          walletId,
        ]);
      }
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating wallet status:', error);
      throw error;
    }
  }

  static async updateLimits(walletId, limits) {
    const query = `
      UPDATE wallets
      SET daily_send_limit = COALESCE($1, daily_send_limit),
          monthly_send_limit = COALESCE($2, monthly_send_limit),
          daily_receive_limit = COALESCE($3, daily_receive_limit),
          monthly_receive_limit = COALESCE($4, monthly_receive_limit),
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, daily_send_limit, monthly_send_limit, daily_receive_limit, monthly_receive_limit
    `;
    try {
      const result = await pool.query(query, [
        limits.daily_send_limit || null,
        limits.monthly_send_limit || null,
        limits.daily_receive_limit || null,
        limits.monthly_receive_limit || null,
        walletId,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating wallet limits:', error);
      throw error;
    }
  }
}

module.exports = Wallet;
