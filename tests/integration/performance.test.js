const request = require('supertest');
const { app } = require('../../server');

describe('Performance Tests', () => {
  let token;
  let todoId;
  const testUser = {
    name: 'Performance User',
    username: 'perfuser',
    email: 'perf@example.com',
    phone: 1234567890,
    password: 'Test@123',
    role: 'owner',
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/signup').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    token = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1];

    // Create test todo
    const todoRes = await request(app)
      .post('/api/todo/create')
      .set('Cookie', [`token=${token}`])
      .send({
        tasks: ['Performance test todo'],
        priority: 'medium',
      });
    todoId = todoRes.body.data._id;
  });

  test('API response time should be under 200ms', async () => {
    const start = Date.now();
    const res = await request(app)
      .get('/api/todo/getall')
      .set('Cookie', [`token=${token}`]);
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('Concurrent requests should handle properly', async () => {
    const requests = Array(10).fill().map(() =>
      request(app)
        .get('/api/todo/getall')
        .set('Cookie', [`token=${token}`])
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach(res => {
      expect(res.status).toBe(200);
    });
    expect(duration).toBeLessThan(500);
  });

  test('Database query performance', async () => {
    const start = Date.now();
    const res = await request(app)
      .get(`/api/todo/search?q=performance`)
      .set('Cookie', [`token=${token}`]);
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(100);
  });
});