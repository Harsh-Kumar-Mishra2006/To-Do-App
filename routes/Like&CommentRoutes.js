//Like&CommentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
  getResponses,
  getCommentsByTodo,
  searchComments  // ✅ Import search
  
} = require('../controllers/Like&CommentController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { validate, commentValidation } = require('../validations/validation');

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ Comment CRUD with validation
router.post('/createComment', requireRole(['owner', 'visitor']), validate(commentValidation.create), createComment);
router.get('/getAllComments', requireRole(['owner', 'visitor']), getAllComments);
router.get('/searchComments', requireRole(['owner', 'visitor']), searchComments);  // ✅ New search route
router.get('/getComment/:id', requireRole(['owner', 'visitor']), getCommentById);
router.put('/updateComment/:id', requireRole(['owner', 'visitor']), validate(commentValidation.update), updateComment);
router.delete('/deleteComment/:id', requireRole(['owner', 'visitor']), deleteComment);

// ✅ Like/Dislike operations
router.post('/likeComment/:id', requireRole(['owner', 'visitor']), likeComment);
router.post('/dislikeComment/:id', requireRole(['owner', 'visitor']), dislikeComment);

// ✅ Get responses
router.get('/getResponses/:id', requireRole(['owner', 'visitor']), getResponses);

// ✅ Get comments by todo
router.get('/todo/:todoId/comments', requireRole(['owner', 'visitor']), getCommentsByTodo);

module.exports = router;