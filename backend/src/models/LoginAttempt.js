const pool = require('../config/database');
const logger = require('../utils/logger');

class LoginAttempt {
  static async create(attemptData) {
    const query = `
      INSERT INTO login_attempts (
        phone_number, username, device_id, ip_address,
        attempt_type, success, failed_reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, success, created_at
    `;
    try {
      const result = await pool.query(query, [
        attemptData.phone_number || null,
        attemptData.username || null,
        attemptData.device_id || null,
        attemptData.ip_address || null,
        attemptData.attempt_type,
        attemptData.success,
        attemptData.failed_reason || null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating login attempt log:', error);
      throw error;
    }
  }

  static async countFailedAttempts(phoneNumber, minutes) {
    const query = `
      SELECT COUNT(*) as count FROM login_attempts
      WHERE phone_number = $1 AND success = FALSE
            AND created_at > NOW() - INTERVAL '${minutes} minutes'
    `;
    try {
      const result = await pool.query(query, [phoneNumber]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error counting failed login attempts:', error);
      throw error;
    }
  }
}

module.exports = LoginAttempt;
