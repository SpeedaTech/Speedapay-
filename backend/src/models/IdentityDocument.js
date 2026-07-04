const pool = require('../config/database');
const logger = require('../utils/logger');

class IdentityDocument {
  static async create(docData) {
    const query = `
      INSERT INTO identity_documents (
        user_id, document_type, document_number, issuing_country,
        issue_date, expiry_date, document_url, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, document_type, verification_status, created_at
    `;
    try {
      const result = await pool.query(query, [
        docData.user_id,
        docData.document_type,
        docData.document_number,
        docData.issuing_country,
        docData.issue_date || null,
        docData.expiry_date || null,
        docData.document_url,
        'pending',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating identity document:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    const query = `
      SELECT id, user_id, document_type, document_number,
             issuing_country, issue_date, expiry_date, document_url,
             verification_status, verified_at, rejection_reason, created_at
      FROM identity_documents WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding identity documents:', error);
      throw error;
    }
  }

  static async updateVerificationStatus(docId, status, reason = null) {
    const query = `
      UPDATE identity_documents
      SET verification_status = $1,
          rejection_reason = $2,
          verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE verified_at END
      WHERE id = $3
      RETURNING id, verification_status
    `;
    try {
      const result = await pool.query(query, [status, reason, docId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating document verification status:', error);
      throw error;
    }
  }

  static async findVerified(userId) {
    const query = `
      SELECT id, document_type, document_number, expiry_date
      FROM identity_documents
      WHERE user_id = $1 AND verification_status = 'verified'
      AND (expiry_date IS NULL OR expiry_date > NOW())
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding verified identity documents:', error);
      throw error;
    }
  }
}

module.exports = IdentityDocument;
