const pool = require('../config/database');
const logger = require('../utils/logger');

class User {
  static async create(userData) {
    const query = `
      INSERT INTO users (
        phone_number, username, first_name, last_name, email,
        password_hash, role, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, phone_number, username, first_name, last_name, email, role, status, created_at
    `;
    try {
      const result = await pool.query(query, [
        userData.phone_number,
        userData.username || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.email || null,
        userData.password_hash || null,
        userData.role || 'customer',
        userData.status || 'active',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(userId) {
    const query = `
      SELECT id, phone_number, username, first_name, last_name, email,
             profile_picture_url, identity_verified, status, role, created_at, updated_at
      FROM users WHERE id = $1 AND status != 'deleted'
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByPhoneNumber(phoneNumber) {
    const query = `
      SELECT id, phone_number, username, first_name, last_name, email,
             password_hash, profile_picture_url, identity_verified, status, role,
             created_at, updated_at
      FROM users WHERE phone_number = $1 AND status != 'deleted'
    `;
    try {
      const result = await pool.query(query, [phoneNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by phone:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    const query = `
      SELECT id, phone_number, username, first_name, last_name, email,
             password_hash, profile_picture_url, identity_verified, status, role,
             created_at, updated_at
      FROM users WHERE username = $1 AND status != 'deleted'
    `;
    try {
      const result = await pool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async update(userId, updateData) {
    const allowedFields = ['first_name', 'last_name', 'email', 'username', 'profile_picture_url', 'status'];
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
      return this.findById(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, phone_number, username, first_name, last_name, email, role, status, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async updatePasswordHash(userId, passwordHash) {
    const query = `
      UPDATE users SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, phone_number, username, first_name, last_name, email
    `;
    try {
      const result = await pool.query(query, [passwordHash, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating password hash:', error);
      throw error;
    }
  }

  static async updatePinHash(userId, pinHash) {
    const query = `
      UPDATE users SET pin_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, phone_number, username
    `;
    try {
      const result = await pool.query(query, [pinHash, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating PIN hash:', error);
      throw error;
    }
  }
}

module.exports = User;
