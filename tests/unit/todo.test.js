const request = require('supertest');
const { app } = require('../../server');
const Auth = require('../../models/authModel');
const Todo = require('../../models/dataModel');

describe('Todo API Tests', () => {
  let token;
  let userId;
  let todoId;

  const testUser = {
    name: 'Todo User',
    username: 'todouser',
    email: 'todo@example.com',
    phone: 1234567890,
    password: 'Test@123',
    role: 'owner',
  };

  const testTodo = {
    tasks: ['Complete project', 'Write tests'],
    priority: 'high',
    dueDate: '2026-12-31',
  };

  beforeAll(async () => {
    // Create user and get token
    await request(app).post('/api/auth/signup').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    token = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
    userId = loginRes.body.data.userId;
  });

  describe('POST /api/todo/create', () => {
    it('should create a new todo successfully', async () => {
      const res = await request(app)
        .post('/api/todo/create')
        .set('Cookie', [`token=${token}`])
        .send(testTodo);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.tasks).toEqual(testTodo.tasks);
      expect(res.body.data.author).toBe(userId);
      todoId = res.body.data._id;
    });

    it('should return error without tasks', async () => {
      const res = await request(app)
        .post('/api/todo/create')
        .set('Cookie', [`token=${token}`])
        .send({ priority: 'medium' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/todo/create')
        .send(testTodo);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/todo/getall', () => {
    it('should get all todos with pagination', async () => {
      const res = await request(app)
        .get('/api/todo/getall')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const res = await request(app)
        .get('/api/todo/getall?limit=5')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/todo/search', () => {
    it('should search todos by query', async () => {
      const res = await request(app)
        .get('/api/todo/search?q=project')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/todo/search?status=false')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.every(todo => todo.isCompleted === false)).toBe(true);
    });
  });

  describe('PUT /api/todo/update/:id', () => {
    it('should update todo successfully', async () => {
      const updateData = {
        tasks: ['Updated task 1', 'Updated task 2'],
        priority: 'low',
      };

      const res = await request(app)
        .put(`/api/todo/update/${todoId}`)
        .set('Cookie', [`token=${token}`])
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tasks).toEqual(updateData.tasks);
      expect(res.body.data.priority).toBe(updateData.priority);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app)
        .put('/api/todo/update/60f7c3b4d4f3a2b4c8e7b123')
        .set('Cookie', [`token=${token}`])
        .send({ tasks: ['Updated task'] });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/todo/delete/:id', () => {
    it('should delete todo successfully', async () => {
      const res = await request(app)
        .delete(`/api/todo/delete/${todoId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for already deleted todo', async () => {
      const res = await request(app)
        .delete(`/api/todo/delete/${todoId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});