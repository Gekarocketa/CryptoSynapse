import request from 'supertest';
import { app } from '../app';

describe('Auth Protection Integration Tests - Protected Routes', () => {
  it('should return 401 Unauthorized when accessing POST /api/alerts without a Bearer token', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        coinId: 'bitcoin',
        targetPrice: 90000,
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/Unauthorized/i);
  });

  it('should return 401 Unauthorized when accessing POST /api/alerts with an invalid token', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .set('Authorization', 'Bearer invalid_expired_token_xyz')
      .send({
        coinId: 'bitcoin',
        targetPrice: 90000,
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/Unauthorized/i);
  });

  it('should return 401 Unauthorized when accessing DELETE /api/alerts/:id without a token', async () => {
    const response = await request(app)
      .delete('/api/alerts/mock-alert-id');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/Unauthorized/i);
  });
});
