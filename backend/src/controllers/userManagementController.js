const UserManagementService = require('../services/userManagementService');
const UserProfile = require('../models/UserProfile');
const KYCSubmission = require('../models/KYCSubmission');
const Beneficiary = require('../models/Beneficiary');
const EmergencyContact = require('../models/EmergencyContact');
const UserPreferences = require('../models/UserPreferences');
const logger = require('../utils/logger');

class UserManagementController {
  /**
   * Get user profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const profile = await UserManagementService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error in getProfile:', error);
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      const updated = await UserManagementService.updateUserProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      next(error);
    }
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletion(req, res, next) {
    try {
      const userId = req.user.userId;
      const completion = await UserManagementService.calculateProfileCompletion(userId);
      const eligibility = await UserManagementService.checkTierEligibility(userId);

      res.status(200).json({
        success: true,
        data: {
          completion_percentage: completion,
          ...eligibility,
        },
      });
    } catch (error) {
      logger.error('Error in getProfileCompletion:', error);
      next(error);
    }
  }

  /**
   * Submit KYC
   */
  static async submitKYC(req, res, next) {
    try {
      const userId = req.user.userId;
      const { kyc_level, ...submissionData } = req.body;

      const submission = await UserManagementService.submitKYC(
        userId,
        kyc_level,
        submissionData
      );

      res.status(201).json({
        success: true,
        message: 'KYC submitted successfully',
        data: submission,
      });
    } catch (error) {
      logger.error('Error in submitKYC:', error);
      next(error);
    }
  }

  /**
   * Get KYC status
   */
  static async getKYCStatus(req, res, next) {
    try {
      const userId = req.user.userId;
      const status = await UserManagementService.getKYCStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Error in getKYCStatus:', error);
      next(error);
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(req, res, next) {
    try {
      const userId = req.user.userId;
      const preferences = await UserPreferences.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error in getPreferences:', error);
      next(error);
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req, res, next) {
    try {
      const userId = req.user.userId;
      const updated = await UserPreferences.update(userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Preferences updated',
        data: updated,
      });
    } catch (error) {
      logger.error('Error in updatePreferences:', error);
      next(error);
    }
  }

  /**
   * Add beneficiary
   */
  static async addBeneficiary(req, res, next) {
    try {
      const userId = req.user.userId;
      const beneficiary = await Beneficiary.create({
        user_id: userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Beneficiary added',
        data: beneficiary,
      });
    } catch (error) {
      logger.error('Error in addBeneficiary:', error);
      next(error);
    }
  }

  /**
   * Get beneficiaries
   */
  static async getBeneficiaries(req, res, next) {
    try {
      const userId = req.user.userId;
      const beneficiaries = await Beneficiary.findByUser(userId);

      res.status(200).json({
        success: true,
        data: beneficiaries,
      });
    } catch (error) {
      logger.error('Error in getBeneficiaries:', error);
      next(error);
    }
  }

  /**
   * Add emergency contact
   */
  static async addEmergencyContact(req, res, next) {
    try {
      const userId = req.user.userId;
      const contact = await EmergencyContact.create({
        user_id: userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Emergency contact added',
        data: contact,
      });
    } catch (error) {
      logger.error('Error in addEmergencyContact:', error);
      next(error);
    }
  }

  /**
   * Get emergency contacts
   */
  static async getEmergencyContacts(req, res, next) {
    try {
      const userId = req.user.userId;
      const contacts = await EmergencyContact.findByUser(userId);

      res.status(200).json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      logger.error('Error in getEmergencyContacts:', error);
      next(error);
    }
  }
}

module.exports = UserManagementController;
