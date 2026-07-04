const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');
const CONSTANTS = require('../config/constants');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization header',
        code: CONSTANTS.ERROR_CODES.INVALID_TOKEN,
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
        code: CONSTANTS.ERROR_CODES.INVALID_TOKEN,
      });
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: CONSTANTS.ERROR_CODES.TOKEN_EXPIRED,
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: CONSTANTS.ERROR_CODES.INVALID_TOKEN,
    });
  }
};

module.exports = authMiddleware;
