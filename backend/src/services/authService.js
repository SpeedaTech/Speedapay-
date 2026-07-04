const OTPVerification = require('../models/OTPVerification');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const LoginAttempt = require('../models/LoginAttempt');
const { hashPassword, comparePassword } = require('../utils/encryption');
const { generateAccessToken, generateRefreshToken, getTokenHash } = require('../utils/jwt');
const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');
const speakeasy = require('speakeasy');

class AuthService {
  static async requestOTP(phoneNumber, purpose) {
    try {
      // Check if user exists (for login)
      if (purpose === CONSTANTS.OTP_PURPOSE.LOGIN) {
        const existingUser = await User.findByPhoneNumber(phoneNumber);
        if (!existingUser) {
          throw {
            statusCode: 404,
            message: 'User not found',
            code: CONSTANTS.ERROR_CODES.USER_NOT_FOUND,
          };
        }
      }

      // Invalidate previous OTPs
      await OTPVerification.invalidateOtpsForPhone(phoneNumber);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const { hashPassword } = require('../utils/encryption');
      const otpHash = await hashPassword(otp);

      // Create OTP record
      const otpRecord = await OTPVerification.create({
        phone_number: phoneNumber,
        otp_hash: otpHash,
        purpose,
      });

      // TODO: Send OTP via SMS (Twilio integration)
      logger.info(`OTP requested for ${phoneNumber} for ${purpose}`);
      // In development, we can return the OTP for testing
      const returnOtp = process.env.NODE_ENV === 'development' ? otp : null;

      return {
        success: true,
        message: 'OTP sent successfully',
        otp_id: otpRecord.id,
        expires_in: process.env.OTP_EXPIRY_MINUTES || 10,
        ...(returnOtp && { otp: returnOtp }), // Only for development
      };
    } catch (error) {
      logger.error('Error requesting OTP:', error);
      throw error;
    }
  }

  static async verifyOTP(phoneNumber, otpCode, purpose) {
    try {
      // Find active OTP
      const otpRecord = await OTPVerification.findActive(phoneNumber, purpose);
      if (!otpRecord) {
        throw {
          statusCode: 404,
          message: 'OTP not found or expired',
          code: CONSTANTS.ERROR_CODES.OTP_EXPIRED,
        };
      }

      // Check max attempts
      if (otpRecord.attempts >= CONSTANTS.CONSTRAINTS.OTP_MAX_ATTEMPTS) {
        throw {
          statusCode: 429,
          message: 'OTP attempts exceeded',
          code: CONSTANTS.ERROR_CODES.OTP_ATTEMPTS_EXCEEDED,
        };
      }

      // Verify OTP
      const { comparePassword } = require('../utils/encryption');
      const isValid = await comparePassword(otpCode, otpRecord.otp_hash);

      if (!isValid) {
        await OTPVerification.incrementAttempts(otpRecord.id);
        throw {
          statusCode: 401,
          message: 'Invalid OTP',
          code: CONSTANTS.ERROR_CODES.INVALID_OTP,
        };
      }

      // Mark OTP as verified
      await OTPVerification.markVerified(otpRecord.id);

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  static async registerUser(phoneNumber, firstName, lastName) {
    try {
      // Check if user already exists
      const existingUser = await User.findByPhoneNumber(phoneNumber);
      if (existingUser) {
        throw {
          statusCode: 409,
          message: 'User already exists',
          code: CONSTANTS.ERROR_CODES.USER_ALREADY_EXISTS,
        };
      }

      // Create user
      const user = await User.create({
        phone_number: phoneNumber,
        first_name: firstName || null,
        last_name: lastName || null,
        role: CONSTANTS.ROLES.CUSTOMER,
        status: CONSTANTS.USER_STATUS.ACTIVE,
      });

      // Log audit
      await AuditLog.create({
        user_id: user.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_CREATED,
        entity_type: 'user',
        entity_id: user.id,
        status: 'success',
      });

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user_id: user.id,
          phone_number: user.phone_number,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      };
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  static async createSession(userId, deviceData, ipAddress, userAgent) {
    try {
      // Generate tokens
      const user = await User.findById(userId);
      const accessToken = generateAccessToken(userId, user.role);
      const refreshToken = generateRefreshToken(userId);

      // Create session
      const session = await Session.create({
        user_id: userId,
        device_id: deviceData.device_id || null,
        device_name: deviceData.device_name || null,
        device_os: deviceData.device_os || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        access_token_hash: getTokenHash(accessToken),
        refresh_token_hash: getTokenHash(refreshToken),
        is_trusted: deviceData.is_trusted || false,
      });

      // Log audit
      await AuditLog.create({
        user_id: userId,
        action: CONSTANTS.AUDIT_ACTIONS.SESSION_CREATED,
        entity_type: 'session',
        entity_id: session.id,
        ip_address: ipAddress,
        device_id: deviceData.device_id || null,
        status: 'success',
      });

      return {
        success: true,
        message: 'Session created successfully',
        data: {
          session_id: session.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: CONSTANTS.CONSTRAINTS.SESSION_TIMEOUT_MINUTES * 60,
          user: {
            id: user.id,
            phone_number: user.phone_number,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
          },
        },
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  static async login(phoneNumber, ipAddress, userAgent, deviceData) {
    try {
      // Find user
      const user = await User.findByPhoneNumber(phoneNumber);
      if (!user) {
        await LoginAttempt.create({
          phone_number: phoneNumber,
          ip_address: ipAddress,
          attempt_type: CONSTANTS.AUTH_METHODS.OTP,
          success: false,
          failed_reason: 'User not found',
        });
        throw {
          statusCode: 404,
          message: 'User not found',
          code: CONSTANTS.ERROR_CODES.USER_NOT_FOUND,
        };
      }

      // Check if account is suspended
      if (user.status === CONSTANTS.USER_STATUS.SUSPENDED) {
        throw {
          statusCode: 403,
          message: 'Account is suspended',
          code: CONSTANTS.ERROR_CODES.ACCOUNT_SUSPENDED,
        };
      }

      // Create session
      const session = await this.createSession(user.id, deviceData, ipAddress, userAgent);

      // Log successful login
      await LoginAttempt.create({
        phone_number: phoneNumber,
        ip_address: ipAddress,
        attempt_type: CONSTANTS.AUTH_METHODS.OTP,
        success: true,
      });

      await AuditLog.create({
        user_id: user.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_LOGIN,
        ip_address: ipAddress,
        device_id: deviceData.device_id || null,
        status: 'success',
      });

      return session;
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
