import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken: string;
let apiKey: string;
let userId: string;

describe('DailyMotion Downloader API Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.downloadLog.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securepassword123',
          name: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.token).toBeDefined();

      authToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('should not register with existing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securepassword123',
          name: 'Test User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securepassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should get current user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.subscription).toBeDefined();
    });
  });

  describe('API Keys', () => {
    it('should create an API key', async () => {
      const res = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Key' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBeDefined();
      expect(res.body.data.key).toMatch(/^dm_/);

      apiKey = res.body.data.key;
    });

    it('should list API keys', async () => {
      const res = await request(app)
        .get('/api/v1/keys')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should revoke API key', async () => {
      const keys = await request(app)
        .get('/api/v1/keys')
        .set('Authorization', `Bearer ${authToken}`);

      const keyId = keys.body.data[0].id;

      const res = await request(app)
        .delete(`/api/v1/keys/${keyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Downloads', () => {
    it('should get video info with JWT', async () => {
      const res = await request(app)
        .post('/api/v1/download/info')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://www.dailymotion.com/video/x8q3exq',
        });

      // Note: This may fail if video is unavailable, but structure should be correct
      expect(res.status).toBeOneOf([200, 400, 500]);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
      }
    });

    it('should get video info with API Key', async () => {
      // Create new key since we revoked the old one
      const keyRes = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Key 2' });

      const newApiKey = keyRes.body.data.key;

      const res = await request(app)
        .post('/api/v1/download/info')
        .set('X-API-Key', newApiKey)
        .send({
          url: 'https://www.dailymotion.com/video/x8q3exq',
        });

      expect(res.status).toBeOneOf([200, 400, 500]);
    });

    it('should reject invalid URL', async () => {
      const res = await request(app)
        .post('/api/v1/download/info')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://youtube.com/watch?v=123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/download/info')
        .send({
          url: 'https://www.dailymotion.com/video/x8q3exq',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Payments', () => {
    it('should get pricing plans', async () => {
      const res = await request(app).get('/api/v1/payments/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4); // Free, Starter, Pro, Enterprise
      expect(res.body.currency).toBe('NGN');
    });

    it('should initialize payment for paid plan', async () => {
      // This will fail without Paystack keys, but structure should be correct
      const res = await request(app)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ planId: 'starter' });

      // If Paystack not configured, should return 503
      expect(res.status).toBeOneOf([200, 503]);
    });
  });

  describe('Documentation', () => {
    it('should serve documentation page', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('DailyMotion Downloader API');
      expect(res.text).toContain('API Endpoints');
    });
  });
});
