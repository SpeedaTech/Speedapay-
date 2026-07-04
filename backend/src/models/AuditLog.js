const pool = require('../config/database');
const logger = require('../utils/logger');

class AuditLog {
  static async create(auditData) {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, changes, ip_address,
        device_id, status, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, user_id, action, created_at
    `;
    try {
      const result = await pool.query(query, [
        auditData.user_id || null,
        auditData.action,
        auditData.entity_type || null,
        auditData.entity_id || null,
        auditData.changes ? JSON.stringify(auditData.changes) : null,
        auditData.ip_address || null,
        auditData.device_id || null,
        auditData.status || 'success',
        auditData.details || null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating audit log:', error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 50) {
    const query = `
      SELECT id, user_id, action, entity_type, entity_id, changes,
             ip_address, device_id, status, details, created_at
      FROM audit_logs WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding audit logs by user:', error);
      throw error;
    }
  }
}

module.exports = AuditLog;
