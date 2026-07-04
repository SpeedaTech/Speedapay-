const pool = require('../config/database');
const logger = require('../utils/logger');

class UserProfile {
  static async create(profileData) {
    const query = `
      INSERT INTO user_profiles (
        user_id, date_of_birth, gender, nationality,
        address_line_1, address_line_2, city, state_province,
        postal_code, country, occupation, employer_name,
        phone_verified, email_verified, account_tier, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, user_id, account_tier, profile_completion_percentage, status, created_at
    `;
    try {
      const result = await pool.query(query, [
        profileData.user_id,
        profileData.date_of_birth || null,
        profileData.gender || null,
        profileData.nationality || null,
        profileData.address_line_1 || null,
        profileData.address_line_2 || null,
        profileData.city || null,
        profileData.state_province || null,
        profileData.postal_code || null,
        profileData.country || null,
        profileData.occupation || null,
        profileData.employer_name || null,
        true, // phone_verified (from auth)
        profileData.email_verified || false,
        'basic',
        'active',
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, date_of_birth, gender, nationality,
             address_line_1, address_line_2, city, state_province,
             postal_code, country, occupation, employer_name,
             business_name, business_type, email_verified, phone_verified,
             address_verified, identity_verified, account_tier,
             profile_completion_percentage, status, created_at, updated_at
      FROM user_profiles WHERE user_id = $1
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user profile:', error);
      throw error;
    }
  }

  static async update(userId, updateData) {
    const allowedFields = [
      'date_of_birth', 'gender', 'nationality',
      'address_line_1', 'address_line_2', 'city', 'state_province',
      'postal_code', 'country', 'occupation', 'employer_name',
      'business_name', 'business_type', 'email_verified'
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
      UPDATE user_profiles
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING id, user_id, account_tier, profile_completion_percentage, status
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async updateTier(userId, tier) {
    const query = `
      UPDATE user_profiles
      SET account_tier = $1, tier_upgraded_at = NOW(), updated_at = NOW()
      WHERE user_id = $2
      RETURNING account_tier, tier_upgraded_at
    `;
    try {
      const result = await pool.query(query, [tier, userId]);
      logger.info(`User ${userId} upgraded to tier: ${tier}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user tier:', error);
      throw error;
    }
  }

  static async updateCompletionPercentage(userId, percentage) {
    const query = `
      UPDATE user_profiles
      SET profile_completion_percentage = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING profile_completion_percentage
    `;
    try {
      await pool.query(query, [percentage, userId]);
    } catch (error) {
      logger.error('Error updating completion percentage:', error);
      throw error;
    }
  }
}

module.exports = UserProfile;
