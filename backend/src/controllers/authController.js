const AuthService = require('../services/authService');
const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');

class AuthController {
  static async requestOTP(req, res, next) {
    try {
      const { phone_number, purpose } = req.body;

      const result = await AuthService.requestOTP(
        phone_number,
        purpose || CONSTANTS.OTP_PURPOSE.LOGIN,
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in requestOTP:', error);
      next(error);
    }
  }

  static async registerWithOTP(req, res, next) {
    try {
      const { phone_number, otp_code, first_name, last_name } = req.body;

      // Verify OTP
      await AuthService.verifyOTP(
        phone_number,
        otp_code,
        CONSTANTS.OTP_PURPOSE.REGISTRATION,
      );

      // Register user
      const registrationResult = await AuthService.registerUser(
        phone_number,
        first_name,
        last_name,
      );

      // Create session
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      const deviceData = {
        device_id: req.body.device_id || null,
        device_name: req.body.device_name || null,
        device_os: req.body.device_os || null,
      };

      const sessionResult = await AuthService.login(
        phone_number,
        ipAddress,
        userAgent,
        deviceData,
      );

      res.status(201).json({
        success: true,
        message: 'User registered and logged in successfully',
        data: {
          ...sessionResult.data,
        },
      });
    } catch (error) {
      logger.error('Error in registerWithOTP:', error);
      next(error);
    }
  }

  static async loginWithOTP(req, res, next) {
    try {
      const { phone_number, otp_code } = req.body;

      // Verify OTP
      await AuthService.verifyOTP(
        phone_number,
        otp_code,
        CONSTANTS.OTP_PURPOSE.LOGIN,
      );

      // Login
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      const deviceData = {
        device_id: req.body.device_id || null,
        device_name: req.body.device_name || null,
        device_os: req.body.device_os || null,
      };

      const result = await AuthService.login(
        phone_number,
        ipAddress,
        userAgent,
        deviceData,
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in loginWithOTP:', error);
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      logger.info(`User ${userId} logged out`);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Error in logout:', error);
      next(error);
    }
  }

  static async getCurrentUser(req, res, next) {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: CONSTANTS.ERROR_CODES.USER_NOT_FOUND,
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error in getCurrentUser:', error);
      next(error);
    }
  }
}

module.exports = AuthController;
