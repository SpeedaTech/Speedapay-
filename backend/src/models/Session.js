const pool = require('../config/database');
const logger = require('../utils/logger');

class Session {
  static async create(sessionData) {
    const query = `
      INSERT INTO sessions (
        user_id, device_id, device_name, device_os, ip_address,
        user_agent, access_token_hash, refresh_token_hash,
        is_trusted, is_active, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW() + INTERVAL '30 days')
      RETURNING id, user_id, device_id, device_name, is_active, created_at, expires_at
    `;
    try {
      const result = await pool.query(query, [
        sessionData.user_id,
        sessionData.device_id || null,
        sessionData.device_name || null,
        sessionData.device_os || null,
        sessionData.ip_address || null,
        sessionData.user_agent || null,
        sessionData.access_token_hash,
        sessionData.refresh_token_hash,
        sessionData.is_trusted || false,
        true,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  static async findById(sessionId) {
    const query = `
      SELECT id, user_id, device_id, device_name, device_os, ip_address,
             is_trusted, is_active, last_activity_at, created_at, expires_at
      FROM sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()
    `;
    try {
      const result = await pool.query(query, [sessionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding session:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, device_id, device_name, device_os, ip_address,
             is_trusted, is_active, last_activity_at, created_at, expires_at
      FROM sessions WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
      ORDER BY last_activity_at DESC
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding user sessions:', error);
      throw error;
    }
  }

  static async updateLastActivity(sessionId) {
    const query = `
      UPDATE sessions SET last_activity_at = NOW()
      WHERE id = $1
    `;
    try {
      await pool.query(query, [sessionId]);
    } catch (error) {
      logger.error('Error updating session activity:', error);
      throw error;
    }
  }

  static async terminate(sessionId) {
    const query = `
      UPDATE sessions SET is_active = FALSE
      WHERE id = $1
    `;
    try {
      await pool.query(query, [sessionId]);
    } catch (error) {
      logger.error('Error terminating session:', error);
      throw error;
    }
  }

  static async terminateAllForUser(userId) {
    const query = `
      UPDATE sessions SET is_active = FALSE
      WHERE user_id = $1
    `;
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      logger.error('Error terminating all sessions:', error);
      throw error;
    }
  }
}

module.module = Session;
module.exports = Session;
