const pool = require('../config/database');
const logger = require('../utils/logger');

class WalletActivityLog {
  static async create(logData) {
    const query = `
      INSERT INTO wallet_activity_logs (
        wallet_id, user_id, activity_type, old_value, new_value, reason, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, wallet_id, activity_type, created_at
    `;
    try {
      const result = await pool.query(query, [
        logData.wallet_id,
        logData.user_id,
        logData.activity_type,
        logData.old_value ? JSON.stringify(logData.old_value) : null,
        logData.new_value ? JSON.stringify(logData.new_value) : null,
        logData.reason || null,
        logData.performed_by || null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating activity log:', error);
      throw error;
    }
  }

  static async findByWallet(walletId, limit = 50) {
    const query = `
      SELECT id, wallet_id, user_id, activity_type, old_value, new_value,
             reason, performed_by, created_at
      FROM wallet_activity_logs
      WHERE wallet_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    try {
      const result = await pool.query(query, [walletId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding activity logs:', error);
      throw error;
    }
  }
}

module.exports = WalletActivityLog;
