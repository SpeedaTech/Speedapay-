const pool = require('../config/database');
const logger = require('../utils/logger');

class TrustedDevice {
  static async create(deviceData) {
    const query = `
      INSERT INTO trusted_devices (
        user_id, device_id, device_name, device_os,
        last_verified_at, is_active, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), TRUE, NOW())
      ON CONFLICT (device_id) DO UPDATE SET
        last_verified_at = NOW(),
        is_active = TRUE
      RETURNING id, user_id, device_id, device_name, is_active
    `;
    try {
      const result = await pool.query(query, [
        deviceData.user_id,
        deviceData.device_id,
        deviceData.device_name || null,
        deviceData.device_os || null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trusted device:', error);
      throw error;
    }
  }

  static async findByDeviceId(deviceId) {
    const query = `
      SELECT id, user_id, device_id, device_name, device_os,
             last_verified_at, is_active, created_at
      FROM trusted_devices WHERE device_id = $1 AND is_active = TRUE
    `;
    try {
      const result = await pool.query(query, [deviceId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding trusted device:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, device_id, device_name, device_os,
             last_verified_at, is_active, created_at
      FROM trusted_devices WHERE user_id = $1 AND is_active = TRUE
      ORDER BY last_verified_at DESC
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding user trusted devices:', error);
      throw error;
    }
  }

  static async revoke(deviceId) {
    const query = `
      UPDATE trusted_devices SET is_active = FALSE
      WHERE device_id = $1
    `;
    try {
      await pool.query(query, [deviceId]);
    } catch (error) {
      logger.error('Error revoking trusted device:', error);
      throw error;
    }
  }
}

module.exports = TrustedDevice;
