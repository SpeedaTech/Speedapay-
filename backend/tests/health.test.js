const request = require('supertest');
const app = require('../src/app');

describe('API Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for undefined routes', async () => {
    const response = await request(app)
      .get('/api/v1/undefined-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
