const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || 3600; // 1 hour
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || 2592000; // 30 days

const generateAccessToken = (userId, role) => {
  try {
    const payload = {
      userId,
      role,
      type: 'access',
    };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'speedapay',
      audience: 'speedapay-api',
    });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw error;
  }
};

const generateRefreshToken = (userId) => {
  try {
    const payload = {
      userId,
      type: 'refresh',
    };
    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'speedapay',
      audience: 'speedapay-api',
    });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw error;
  }
};

const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'speedapay',
      audience: 'speedapay-api',
    });
    return decoded;
  } catch (error) {
    logger.error('Error verifying access token:', error.message);
    throw error;
  }
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'speedapay',
      audience: 'speedapay-api',
    });
    return decoded;
  } catch (error) {
    logger.error('Error verifying refresh token:', error.message);
    throw error;
  }
};

const getTokenHash = (token) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenHash,
};
