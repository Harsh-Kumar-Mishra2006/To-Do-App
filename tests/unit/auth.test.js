const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../server');
const Auth = require('../../models/authModel');

describe('Authentication API Tests', () => {
  const testUser = {
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    phone: 1234567890,
    password: 'Test@123',
    role: 'visitor',
  };

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userId');
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.username).toBe(testUser.username);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return error for duplicate email', async () => {
      await request(app).post('/api/auth/signup').send(testUser);

      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/);
    });

    it('should return validation error for invalid data', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      const res = await request(app)
        .post('/api/auth/signup')
        .send(invalidUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send(testUser);
    });

    it('should login successfully with email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userId');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should login successfully with username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return error for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userId');
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should return error without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return error with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', ['token=invalid-token']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});