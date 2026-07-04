const pool = require('../config/database');
const logger = require('../utils/logger');

class WalletLimit {
  static async create(limitData) {
    const query = `
      INSERT INTO wallet_limits (
        wallet_id, daily_sent_amount, daily_received_amount,
        monthly_sent_amount, monthly_received_amount
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, wallet_id, daily_sent_amount, daily_received_amount,
                monthly_sent_amount, monthly_received_amount
    `;
    try {
      const result = await pool.query(query, [
        limitData.wallet_id,
        0,
        0,
        0,
        0,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating wallet limit:', error);
      throw error;
    }
  }

  static async findByWallet(walletId) {
    const query = `
      SELECT id, wallet_id, daily_sent_amount, daily_sent_count,
             daily_received_amount, daily_received_count,
             monthly_sent_amount, monthly_sent_count,
             monthly_received_amount, monthly_received_count,
             daily_reset_at, monthly_reset_at
      FROM wallet_limits WHERE wallet_id = $1
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding wallet limit:', error);
      throw error;
    }
  }

  static async recordSent(walletId, amount) {
    const query = `
      UPDATE wallet_limits
      SET daily_sent_amount = daily_sent_amount + $1,
          daily_sent_count = daily_sent_count + 1,
          monthly_sent_amount = monthly_sent_amount + $1,
          monthly_sent_count = monthly_sent_count + 1,
          updated_at = NOW()
      WHERE wallet_id = $2
      RETURNING daily_sent_amount, daily_sent_count, monthly_sent_amount, monthly_sent_count
    `;
    try {
      const result = await pool.query(query, [amount, walletId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording sent amount:', error);
      throw error;
    }
  }

  static async recordReceived(walletId, amount) {
    const query = `
      UPDATE wallet_limits
      SET daily_received_amount = daily_received_amount + $1,
          daily_received_count = daily_received_count + 1,
          monthly_received_amount = monthly_received_amount + $1,
          monthly_received_count = monthly_received_count + 1,
          updated_at = NOW()
      WHERE wallet_id = $2
      RETURNING daily_received_amount, daily_received_count, monthly_received_amount, monthly_received_count
    `;
    try {
      const result = await pool.query(query, [amount, walletId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording received amount:', error);
      throw error;
    }
  }

  static async resetDailyLimits(walletId) {
    const query = `
      UPDATE wallet_limits
      SET daily_sent_amount = 0,
          daily_sent_count = 0,
          daily_received_amount = 0,
          daily_received_count = 0,
          daily_reset_at = NOW() + INTERVAL '1 day'
      WHERE wallet_id = $1
    `;
    try {
      await pool.query(query, [walletId]);
    } catch (error) {
      logger.error('Error resetting daily limits:', error);
      throw error;
    }
  }

  static async resetMonthlyLimits(walletId) {
    const query = `
      UPDATE wallet_limits
      SET monthly_sent_amount = 0,
          monthly_sent_count = 0,
          monthly_received_amount = 0,
          monthly_received_count = 0,
          monthly_reset_at = NOW() + INTERVAL '1 month'
      WHERE wallet_id = $1
    `;
    try {
      await pool.query(query, [walletId]);
    } catch (error) {
      logger.error('Error resetting monthly limits:', error);
      throw error;
    }
  }
}

module.exports = WalletLimit;
