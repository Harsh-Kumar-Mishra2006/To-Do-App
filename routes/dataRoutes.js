const express = require('express');
const router = express.Router();
const { 
  createtodo, 
  getalltodo, 
  updatetodo, 
  deletetodo,
  gettodobyId,
  getCompletedTodos,
  searchTodos  // ✅ Import search
} = require('../controllers/dataController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { validate, todoValidation } = require('../validations/validation');

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ Routes with validation
router.post('/create', requireRole(['owner']), validate(todoValidation.create), createtodo);
router.get('/getall', requireRole(['owner', 'visitor']), getalltodo);
router.get('/search', requireRole(['owner', 'visitor']), searchTodos);  // ✅ New search route
router.get('/:id', requireRole(['owner', 'visitor']), gettodobyId);
router.put('/update/:id', requireRole(['owner']), validate(todoValidation.update), updatetodo);
router.delete('/delete/:id', requireRole(['owner']), deletetodo);
router.get('/completed/filter', requireRole(['owner', 'visitor']), getCompletedTodos);

module.exports = router;