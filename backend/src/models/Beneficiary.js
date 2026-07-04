const pool = require('../config/database');
const logger = require('../utils/logger');

class Beneficiary {
  static async create(beneficiaryData) {
    const query = `
      INSERT INTO beneficiaries (
        user_id, beneficiary_user_id, name, phone_number, email,
        relationship, bank_name, account_number, routing_number,
        swift_code, daily_limit, monthly_limit, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, user_id, name, phone_number, status, created_at
    `;
    try {
      const result = await pool.query(query, [
        beneficiaryData.user_id,
        beneficiaryData.beneficiary_user_id || null,
        beneficiaryData.name,
        beneficiaryData.phone_number || null,
        beneficiaryData.email || null,
        beneficiaryData.relationship || null,
        beneficiaryData.bank_name || null,
        beneficiaryData.account_number || null,
        beneficiaryData.routing_number || null,
        beneficiaryData.swift_code || null,
        beneficiaryData.daily_limit || null,
        beneficiaryData.monthly_limit || null,
        'active',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating beneficiary:', error);
      throw error;
    }
  }

  static async findByUser(userId, limit = 50) {
    const query = `
      SELECT id, user_id, beneficiary_user_id, name, phone_number, email,
             relationship, bank_name, account_number, status, verified,
             daily_limit, monthly_limit, created_at
      FROM beneficiaries WHERE user_id = $1 AND status = 'active'
      LIMIT $2
    `;
    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding user beneficiaries:', error);
      throw error;
    }
  }

  static async findById(beneficiaryId, userId) {
    const query = `
      SELECT id, user_id, beneficiary_user_id, name, phone_number,
             relationship, status, verified, created_at
      FROM beneficiaries WHERE id = $1 AND user_id = $2
    `;
    try {
      const result = await pool.query(query, [beneficiaryId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding beneficiary:', error);
      throw error;
    }
  }

  static async delete(beneficiaryId, userId) {
    const query = `
      UPDATE beneficiaries SET status = 'deleted'
      WHERE id = $1 AND user_id = $2
    `;
    try {
      await pool.query(query, [beneficiaryId, userId]);
    } catch (error) {
      logger.error('Error deleting beneficiary:', error);
      throw error;
    }
  }
}

module.exports = Beneficiary;
