const pool = require('../config/database');
const logger = require('../utils/logger');

class UserPreferences {
  static async create(userId) {
    const query = `
      INSERT INTO user_preferences (
        user_id, email_notifications, sms_notifications, push_notifications,
        language, timezone, currency_display
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, language, timezone
    `;
    try {
      const result = await pool.query(query, [
        userId,
        true,
        true,
        true,
        'en',
        'UTC',
        'USD',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user preferences:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, email_notifications, sms_notifications,
             push_notifications, notify_on_send, notify_on_receive,
             require_pin_for_transfer, two_factor_enabled,
             biometric_enabled, language, timezone, currency_display,
             profile_visibility, created_at, updated_at
      FROM user_preferences WHERE user_id = $1
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user preferences:', error);
      throw error;
    }
  }

  static async update(userId, updateData) {
    const allowedFields = [
      'email_notifications', 'sms_notifications', 'push_notifications',
      'notify_on_send', 'notify_on_receive', 'notify_threshold',
      'require_pin_for_transfer', 'two_factor_enabled', 'biometric_enabled',
      'language', 'timezone', 'currency_display',
      'profile_visibility', 'show_online_status'
    ];

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount += 1;
      }
    });

    if (fields.length === 0) {
      return this.findByUserId(userId);
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE user_preferences
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING id, language, timezone, currency_display
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }
}

module.exports = UserPreferences;
