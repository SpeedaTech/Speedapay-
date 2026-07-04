module.exports = {
  // User Roles
  ROLES: {
    CUSTOMER: 'customer',
    MERCHANT: 'merchant',
    AGENT: 'agent',
    SUPPORT: 'support',
    FINANCE: 'finance',
    DEVELOPER: 'developer',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },

  // User Status
  USER_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
  },

  // OTP Purpose
  OTP_PURPOSE: {
    REGISTRATION: 'registration',
    LOGIN: 'login',
    PASSWORD_RESET: 'password_reset',
    PHONE_CHANGE: 'phone_change',
    TRANSACTION: 'transaction',
  },

  // Authentication Methods
  AUTH_METHODS: {
    OTP: 'otp',
    PASSWORD: 'password',
    PIN: 'pin',
    FINGERPRINT: 'fingerprint',
    FACE_ID: 'face_id',
    TRUSTED_DEVICE: 'trusted_device',
  },

  // Audit Log Actions
  AUDIT_ACTIONS: {
    USER_CREATED: 'user_created',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_UPDATED: 'user_updated',
    PIN_SET: 'pin_set',
    PIN_CHANGED: 'pin_changed',
    PASSWORD_CHANGED: 'password_changed',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    DEVICE_TRUSTED: 'device_trusted',
    SESSION_CREATED: 'session_created',
    SESSION_TERMINATED: 'session_terminated',
    LOGIN_FAILED: 'login_failed',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    INVALID_OTP: 'INVALID_OTP',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },

  // Constraints
  CONSTRAINTS: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_ATTEMPT_WINDOW_MINUTES: 15,
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 10,
    OTP_MAX_ATTEMPTS: 3,
    PIN_LENGTH: 4,
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    SESSION_TIMEOUT_MINUTES: 30,
    REFRESH_TOKEN_EXPIRY_DAYS: 30,
  },
};
