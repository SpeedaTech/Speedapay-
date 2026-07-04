const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;
try {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect();
} catch (error) {
  logger.warn('Redis not available, using memory store for rate limiting');
}

const loginLimiter = rateLimit({
  windowMs: (process.env.LOGIN_ATTEMPT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: process.env.LOGIN_ATTEMPT_LIMIT || 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path !== '/api/v1/auth/verify-otp',
  store: redisClient ? new RedisStore({ client: redisClient, prefix: 'login-limit:' }) : undefined,
});

const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path !== '/api/v1/auth/request-otp',
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  otpRequestLimiter,
  generalLimiter,
};
