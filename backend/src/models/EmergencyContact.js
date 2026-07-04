const pool = require('../config/database');
const logger = require('../utils/logger');

class EmergencyContact {
  static async create(contactData) {
    const query = `
      INSERT INTO emergency_contacts (
        user_id, name, phone_number, email, relationship, priority
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, name, phone_number, priority, created_at
    `;
    try {
      const result = await pool.query(query, [
        contactData.user_id,
        contactData.name,
        contactData.phone_number,
        contactData.email || null,
        contactData.relationship || null,
        contactData.priority || 1,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating emergency contact:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    const query = `
      SELECT id, user_id, name, phone_number, email, relationship,
             priority, verified, verified_at, created_at
      FROM emergency_contacts WHERE user_id = $1
      ORDER BY priority ASC
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding emergency contacts:', error);
      throw error;
    }
  }

  static async delete(contactId, userId) {
    const query = `
      DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2
    `;
    try {
      await pool.query(query, [contactId, userId]);
    } catch (error) {
      logger.error('Error deleting emergency contact:', error);
      throw error;
    }
  }
}

module.exports = EmergencyContact;
