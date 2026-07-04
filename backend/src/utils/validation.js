const { body, validationResult } = require('express-validator');

const validatePhoneNumber = body('phone_number')
  .notEmpty()
  .withMessage('Phone number is required')
  .matches(/^\+?[0-9]{10,15}$/)
  .withMessage('Invalid phone number format');

const validateOTP = body('otp_code')
  .notEmpty()
  .withMessage('OTP is required')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be 6 digits');

const validatePassword = body('password')
  .notEmpty()
  .withMessage('Password is required')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

const validatePIN = body('pin')
  .notEmpty()
  .withMessage('PIN is required')
  .isLength({ min: 4, max: 4 })
  .withMessage('PIN must be exactly 4 digits')
  .isNumeric()
  .withMessage('PIN must contain only numbers');

const validateEmail = body('email')
  .optional()
  .isEmail()
  .withMessage('Invalid email format');

const validateUsername = body('username')
  .optional()
  .isLength({ min: 3, max: 50 })
  .withMessage('Username must be between 3 and 50 characters')
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Username can only contain letters, numbers, underscores, and hyphens');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  validatePhoneNumber,
  validateOTP,
  validatePassword,
  validatePIN,
  validateEmail,
  validateUsername,
  handleValidationErrors,
};
