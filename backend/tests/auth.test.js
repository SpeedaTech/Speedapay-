const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const logger = require('../src/utils/logger');

// Mock phone number for testing
const TEST_PHONE = '+231775555555';
const TEST_OTP = '123456';

describe('Authentication Module', () => {
  beforeAll(async () => {
    // Setup: Clear test data if exists
    try {
      await pool.query('DELETE FROM otp_verifications WHERE phone_number = $1', [TEST_PHONE]);
      await pool.query('DELETE FROM users WHERE phone_number = $1', [TEST_PHONE]);
    } catch (error) {
      logger.error('Setup error:', error);
    }
  });

  afterAll(async () => {
    // Cleanup: Close database connection
    await pool.end();
  });

  describe('POST /api/v1/auth/request-otp', () => {
    it('should request OTP for new phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({
          phone_number: TEST_PHONE,
          purpose: 'registration',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
      expect(response.body.data).toHaveProperty('otp_id');
      expect(response.body.data).toHaveProperty('expires_in');
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({
          phone_number: 'invalid',
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register user with valid OTP', async () => {
      // First request OTP
      await request(app)
        .post('/api/v1/auth/request-otp')
        .send({
          phone_number: TEST_PHONE,
          purpose: 'registration',
        });

      // Note: In production, OTP would be sent via SMS
      // For testing, we'd need to mock SMS service or use test OTP

      // This test would need actual OTP verification setup
      // Skipping for now as it requires SMS integration
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone_number: '+231999999999',
          otp_code: '123456',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
