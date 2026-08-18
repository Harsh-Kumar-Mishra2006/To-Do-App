const request = require('supertest');
const { app } = require('../../server');

describe('Comment & Like API Tests', () => {
  let token;
  let todoId;
  let commentId;
  let userId;

  const testUser = {
    name: 'Comment User',
    username: 'commentuser',
    email: 'comment@example.com',
    phone: 1234567890,
    password: 'Test@123',
    role: 'visitor',
  };

  const testComment = {
    comment: 'This is a test comment',
  };

  beforeAll(async () => {
    // Create user and login
    await request(app).post('/api/auth/signup').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    token = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
    userId = loginRes.body.data.userId;

    // Create a todo
    const todoRes = await request(app)
      .post('/api/todo/create')
      .set('Cookie', [`token=${token}`])
      .send({
        tasks: ['Test todo for comments'],
        priority: 'medium',
      });
    todoId = todoRes.body.data._id;
  });

  describe('POST /api/likecomment/createComment', () => {
    it('should create a comment successfully', async () => {
      const res = await request(app)
        .post('/api/likecomment/createComment')
        .set('Cookie', [`token=${token}`])
        .send({
          todoId,
          comment: testComment.comment,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.comment).toBe(testComment.comment);
      commentId = res.body.data._id;
    });

    it('should return error without todoId', async () => {
      const res = await request(app)
        .post('/api/likecomment/createComment')
        .set('Cookie', [`token=${token}`])
        .send({ comment: 'Test comment' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/likecomment/getAllComments', () => {
    it('should get all comments', async () => {
      const res = await request(app)
        .get(`/api/likecomment/getAllComments?todoId=${todoId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/likecomment/likeComment/:id', () => {
    it('should like a comment', async () => {
      const res = await request(app)
        .post(`/api/likecomment/likeComment/${commentId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.likes).toBe(1);
    });

    it('should unlike a comment (toggle)', async () => {
      const res = await request(app)
        .post(`/api/likecomment/likeComment/${commentId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.likes).toBe(0);
    });
  });

  describe('POST /api/likecomment/dislikeComment/:id', () => {
    it('should dislike a comment', async () => {
      const res = await request(app)
        .post(`/api/likecomment/dislikeComment/${commentId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dislikes).toBe(1);
    });
  });

  describe('PUT /api/likecomment/updateComment/:id', () => {
    it('should update comment', async () => {
      const updateData = { comment: 'Updated test comment' };

      const res = await request(app)
        .put(`/api/likecomment/updateComment/${commentId}`)
        .set('Cookie', [`token=${token}`])
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comment).toBe(updateData.comment);
    });
  });

  describe('DELETE /api/likecomment/deleteComment/:id', () => {
    it('should delete comment', async () => {
      const res = await request(app)
        .delete(`/api/likecomment/deleteComment/${commentId}`)
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});