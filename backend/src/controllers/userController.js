const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/encryption');
const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');

class UserController {
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const { first_name, last_name, email, username } = req.body;

      const updateData = {};
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
      if (email) updateData.email = email;
      if (username) updateData.username = username;

      const updatedUser = await User.update(userId, updateData);

      await AuditLog.create({
        user_id: userId,
        action: CONSTANTS.AUDIT_ACTIONS.USER_UPDATED,
        entity_type: 'user',
        entity_id: userId,
        changes: updateData,
        status: 'success',
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      next(error);
    }
  }

  static async setPin(req, res, next) {
    try {
      const userId = req.user.userId;
      const { pin, confirm_pin } = req.body;

      if (pin !== confirm_pin) {
        return res.status(400).json({
          success: false,
          message: 'PINs do not match',
        });
      }

      const pinHash = await hashPassword(pin);
      await User.updatePinHash(userId, pinHash);

      await AuditLog.create({
        user_id: userId,
        action: CONSTANTS.AUDIT_ACTIONS.PIN_SET,
        entity_type: 'user',
        entity_id: userId,
        status: 'success',
      });

      res.status(200).json({
        success: true,
        message: 'PIN set successfully',
      });
    } catch (error) {
      logger.error('Error setting PIN:', error);
      next(error);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const userId = req.user.userId;
      const limit = req.query.limit || 50;

      const logs = await AuditLog.findByUserId(userId, limit);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      next(error);
    }
  }
}

module.exports = UserController;
