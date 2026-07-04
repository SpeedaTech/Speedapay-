const pool = require('../config/database');
const logger = require('../utils/logger');

class WalletHold {
  static async create(holdData) {
    const query = `
      INSERT INTO wallet_holds (
        wallet_id, user_id, transaction_id, amount, reason,
        status, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '24 hours')
      RETURNING id, wallet_id, amount, status, expires_at
    `;
    try {
      const result = await pool.query(query, [
        holdData.wallet_id,
        holdData.user_id,
        holdData.transaction_id || null,
        holdData.amount,
        holdData.reason || null,
        'active',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating hold:', error);
      throw error;
    }
  }

  static async findActiveHolds(walletId) {
    const query = `
      SELECT id, wallet_id, amount, reason, created_at, expires_at
      FROM wallet_holds
      WHERE wallet_id = $1 AND status = 'active' AND expires_at > NOW()
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding active holds:', error);
      throw error;
    }
  }

  static async getTotalHeldAmount(walletId) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_held
      FROM wallet_holds
      WHERE wallet_id = $1 AND status = 'active' AND expires_at > NOW()
    `;
    try {
      const result = await pool.query(query, [walletId]);
      return parseFloat(result.rows[0].total_held);
    } catch (error) {
      logger.error('Error calculating total held amount:', error);
      throw error;
    }
  }

  static async release(holdId) {
    const query = `
      UPDATE wallet_holds
      SET status = 'released', released_at = NOW()
      WHERE id = $1
      RETURNING id, status
    `;
    try {
      const result = await pool.query(query, [holdId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error releasing hold:', error);
      throw error;
    }
  }

  static async expireOldHolds() {
    const query = `
      UPDATE wallet_holds
      SET status = 'expired'
      WHERE status = 'active' AND expires_at <= NOW()
    `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error('Error expiring holds:', error);
      throw error;
    }
  }
}

module.exports = WalletHold;
