const express = require('express');
const router = express.Router();
const { 
  createtodo, 
  getalltodo, 
  updatetodo, 
  deletetodo,
  gettodobyId,
  getCompletedTodos,
  searchTodos,
  deleteAttachment,
  downloadAttachment,
  getAttachmentInfo,
  bulkUpload
} = require('../controllers/dataController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { validate, todoValidation } = require('../validations/validation');
const { upload, handleFileUpload } = require('../src/utils/fileUpload');

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ Routes with file upload
router.post('/create', 
  requireRole(['owner']),
  upload.array('files', 5), // Max 5 files
  handleFileUpload,
  validate(todoValidation.create),
  createtodo
);

// ✅ Update with file upload
router.put('/update/:id',
  requireRole(['owner']),
  upload.array('files', 5),
  handleFileUpload,
  validate(todoValidation.update),
  updatetodo
);

// ✅ Bulk upload files
router.post('/bulk-upload/:todoId',
  requireRole(['owner']),
  upload.array('files', 10),
  handleFileUpload,
  bulkUpload
);

// ✅ Attachment management
router.delete('/:id/attachment/:attachmentId',
  requireRole(['owner']),
  deleteAttachment
);

router.get('/:id/attachment/:attachmentId/download',
  requireRole(['owner', 'visitor']),
  downloadAttachment
);

router.get('/:id/attachment/:attachmentId/info',
  requireRole(['owner', 'visitor']),
  getAttachmentInfo
);

// ✅ Other routes
router.get('/getall', requireRole(['owner', 'visitor']), getalltodo);
router.get('/search', requireRole(['owner', 'visitor']), searchTodos);
router.get('/:id', requireRole(['owner', 'visitor']), gettodobyId);
router.delete('/delete/:id', requireRole(['owner']), deletetodo);
router.get('/completed/filter', requireRole(['owner', 'visitor']), getCompletedTodos);

module.exports = router;