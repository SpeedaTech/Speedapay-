const pool = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class OTPVerification {
  static async create(otpData) {
    const query = `
      INSERT INTO otp_verifications (
        user_id, phone_number, otp_hash, purpose, attempts, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '${process.env.OTP_EXPIRY_MINUTES || 10} minutes')
      RETURNING id, user_id, phone_number, purpose, attempts, expires_at
    `;
    try {
      const result = await pool.query(query, [
        otpData.user_id || null,
        otpData.phone_number,
        otpData.otp_hash,
        otpData.purpose,
        0,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating OTP:', error);
      throw error;
    }
  }

  static async findActive(phoneNumber, purpose) {
    const query = `
      SELECT id, user_id, phone_number, purpose, attempts, is_verified,
             created_at, expires_at
      FROM otp_verifications
      WHERE phone_number = $1 AND purpose = $2 AND is_verified = FALSE
             AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    try {
      const result = await pool.query(query, [phoneNumber, purpose]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding active OTP:', error);
      throw error;
    }
  }

  static async incrementAttempts(otpId) {
    const query = `
      UPDATE otp_verifications
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING id, attempts
    `;
    try {
      const result = await pool.query(query, [otpId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error incrementing OTP attempts:', error);
      throw error;
    }
  }

  static async markVerified(otpId) {
    const query = `
      UPDATE otp_verifications
      SET is_verified = TRUE, verified_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, is_verified
    `;
    try {
      const result = await pool.query(query, [otpId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking OTP as verified:', error);
      throw error;
    }
  }

  static async invalidateOtpsForPhone(phoneNumber) {
    const query = `
      UPDATE otp_verifications
      SET is_verified = TRUE
      WHERE phone_number = $1 AND is_verified = FALSE
    `;
    try {
      await pool.query(query, [phoneNumber]);
    } catch (error) {
      logger.error('Error invalidating OTPs:', error);
      throw error;
    }
  }
}

module.exports = OTPVerification;
