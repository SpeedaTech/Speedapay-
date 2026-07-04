const pool = require('../config/database');
const logger = require('../utils/logger');

class KYCSubmission {
  static async create(submissionData) {
    const query = `
      INSERT INTO kyc_submissions (
        user_id, kyc_level, submission_data, review_status
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, kyc_level, review_status, created_at
    `;
    try {
      const result = await pool.query(query, [
        submissionData.user_id,
        submissionData.kyc_level,
        JSON.stringify(submissionData.submission_data),
        'pending',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating KYC submission:', error);
      throw error;
    }
  }

  static async findLatestByUser(userId) {
    const query = `
      SELECT id, user_id, kyc_level, submission_data, review_status,
             auto_review_passed, reviewed_at, review_notes, created_at
      FROM kyc_submissions WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding latest KYC submission:', error);
      throw error;
    }
  }

  static async updateReviewStatus(submissionId, status, notes = null) {
    const query = `
      UPDATE kyc_submissions
      SET review_status = $1,
          review_notes = $2,
          reviewed_at = NOW()
      WHERE id = $3
      RETURNING id, review_status
    `;
    try {
      const result = await pool.query(query, [status, notes, submissionId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating KYC review status:', error);
      throw error;
    }
  }

  static async findPendingReview(limit = 50) {
    const query = `
      SELECT id, user_id, kyc_level, auto_review_passed, created_at
      FROM kyc_submissions
      WHERE review_status = 'pending' OR review_status = 'manual_review'
      ORDER BY created_at ASC
      LIMIT $1
    `;
    try {
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding pending KYC submissions:', error);
      throw error;
    }
  }
}

module.exports = KYCSubmission;
