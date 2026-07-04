const UserProfile = require('../models/UserProfile');
const IdentityDocument = require('../models/IdentityDocument');
const KYCSubmission = require('../models/KYCSubmission');
const UserPreferences = require('../models/UserPreferences');
const logger = require('../utils/logger');

const TIER_REQUIREMENTS = {
  basic: {
    requirements: ['phone_verified'],
    limits: { daily_send: 100, monthly_send: 500 }
  },
  standard: {
    requirements: ['phone_verified', 'email_verified', 'kyc_lite_approved'],
    limits: { daily_send: 1000, monthly_send: 10000 }
  },
  premium: {
    requirements: ['phone_verified', 'email_verified', 'kyc_full_approved', 'identity_verified', 'address_verified'],
    limits: { daily_send: 5000, monthly_send: 50000 }
  }
};

class UserManagementService {
  /**
   * Initialize user profile and preferences after registration
   */
  static async initializeUserProfile(userId, userData) {
    try {
      // Create user profile
      const profile = await UserProfile.create({
        user_id: userId,
        email_verified: userData.email_verified || false,
      });

      // Create user preferences
      await UserPreferences.create(userId);

      logger.info(`Initialized profile for user ${userId}`);
      return profile;
    } catch (error) {
      logger.error('Error initializing user profile:', error);
      throw error;
    }
  }

  /**
   * Get complete user profile with all details
   */
  static async getUserProfile(userId) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      if (!profile) {
        throw {
          statusCode: 404,
          message: 'User profile not found',
        };
      }

      return profile;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId, updateData) {
    try {
      const updated = await UserProfile.update(userId, updateData);
      await this.recalculateProfileCompletion(userId);
      return updated;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  static async calculateProfileCompletion(userId) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      if (!profile) return 0;

      const fields = [
        { name: 'date_of_birth', weight: 10 },
        { name: 'nationality', weight: 5 },
        { name: 'address_line_1', weight: 15 },
        { name: 'city', weight: 10 },
        { name: 'country', weight: 10 },
        { name: 'occupation', weight: 10 },
        { name: 'email_verified', weight: 20 },
        { name: 'identity_verified', weight: 10 },
      ];

      let completionScore = 10; // Base 10% for phone verification

      fields.forEach((field) => {
        if (profile[field.name]) {
          completionScore += field.weight;
        }
      });

      return Math.min(completionScore, 100);
    } catch (error) {
      logger.error('Error calculating profile completion:', error);
      return 0;
    }
  }

  /**
   * Recalculate and update profile completion
   */
  static async recalculateProfileCompletion(userId) {
    try {
      const completion = await this.calculateProfileCompletion(userId);
      await UserProfile.updateCompletionPercentage(userId, completion);
      return completion;
    } catch (error) {
      logger.error('Error recalculating profile completion:', error);
      throw error;
    }
  }

  /**
   * Check if user is eligible for tier upgrade
   */
  static async checkTierEligibility(userId) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      if (!profile) return null;

      const currentTier = profile.account_tier;
      const nextTier = this.getNextTier(currentTier);

      if (!nextTier) return null;

      const requirements = TIER_REQUIREMENTS[nextTier];
      const missingRequirements = [];

      // Check each requirement
      for (const req of requirements.requirements) {
        if (req === 'kyc_lite_approved' || req === 'kyc_full_approved') {
          const kycSubmission = await KYCSubmission.findLatestByUser(userId);
          if (!kycSubmission || kycSubmission.review_status !== 'approved') {
            missingRequirements.push(req);
          }
        } else if (!profile[req]) {
          missingRequirements.push(req);
        }
      }

      return {
        current_tier: currentTier,
        next_tier: nextTier,
        eligible: missingRequirements.length === 0,
        missing_requirements: missingRequirements,
      };
    } catch (error) {
      logger.error('Error checking tier eligibility:', error);
      throw error;
    }
  }

  /**
   * Auto-upgrade user tier if eligible
   */
  static async autoUpgradeTier(userId) {
    try {
      const eligibility = await this.checkTierEligibility(userId);
      if (eligibility && eligibility.eligible) {
        await UserProfile.updateTier(userId, eligibility.next_tier);
        logger.info(`Auto-upgraded user ${userId} to tier: ${eligibility.next_tier}`);
        return eligibility.next_tier;
      }
      return null;
    } catch (error) {
      logger.error('Error auto-upgrading tier:', error);
      throw error;
    }
  }

  /**
   * Submit KYC
   */
  static async submitKYC(userId, kycLevel, submissionData) {
    try {
      // Check if already has pending KYC
      const latestKYC = await KYCSubmission.findLatestByUser(userId);
      if (latestKYC && latestKYC.review_status === 'pending') {
        throw {
          statusCode: 400,
          message: 'You already have a KYC submission pending review',
        };
      }

      // Create new KYC submission
      const submission = await KYCSubmission.create({
        user_id: userId,
        kyc_level: kycLevel,
        submission_data: submissionData,
      });

      logger.info(`User ${userId} submitted KYC: ${kycLevel}`);
      return submission;
    } catch (error) {
      logger.error('Error submitting KYC:', error);
      throw error;
    }
  }

  /**
   * Get KYC status
   */
  static async getKYCStatus(userId) {
    try {
      const submission = await KYCSubmission.findLatestByUser(userId);
      if (!submission) {
        return {
          current_level: null,
          status: 'not_started',
        };
      }

      return {
        current_level: submission.kyc_level,
        status: submission.review_status,
        submitted_at: submission.created_at,
        reviewed_at: submission.reviewed_at,
        review_notes: submission.review_notes,
      };
    } catch (error) {
      logger.error('Error getting KYC status:', error);
      throw error;
    }
  }

  /**
   * Helper: Get next tier in progression
   */
  static getNextTier(currentTier) {
    const tierProgression = { basic: 'standard', standard: 'premium', premium: 'merchant' };
    return tierProgression[currentTier] || null;
  }
}

module.exports = UserManagementService;
