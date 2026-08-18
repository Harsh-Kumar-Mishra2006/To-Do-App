//dataController.js
const mongoose = require('mongoose');
const Todo = require('../models/dataModel');
const Auth = require('../models/authModel');
const { logger, logPerformance } = require('../src/utils/logger');
const { deleteFile, deleteDirectory } = require('../src/utils/fileUpload');
const path = require('path');
const fs = require('fs');

// GET ALL TODOS - ✅ Fixed pagination
const getalltodo = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const pageSize = parseInt(limit) || 10;
    const userId = req.user.userId;  // Get user's own todos

    // Query for user's todos only
    let query = { author: userId };

    // If cursor is provided, fetch todos after that ID
    if (cursor) {
      query._id = { $gt: cursor };
    }

    // Fetch todos sorted by ID, limited to pageSize
    const allTodos = await Todo.find(query)  // ✅ Use allTodos consistently
      .sort({ _id: 1 })
      .limit(pageSize)
      .lean();

    // Get next cursor
    let nextCursor = null;
    if (allTodos.length === pageSize) {  // ✅ Fixed: length is property, not function
      nextCursor = allTodos[allTodos.length - 1]._id;  // ✅ Use allTodos
    }

    return res.status(200).json({
      success: true,
      data: allTodos,  // ✅ Use allTodos
      pagination: {
        nextCursor: nextCursor,
        currentPageSize: allTodos.length,  // ✅ Use allTodos
      },
      message: "Todos fetched successfully"
    });

  } catch (error) {
    console.log('Error getting todos:', error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching todos"
    });
  }
};


// GET TODO BY ID - ✅ Fixed
const gettodobyId = async (req, res) => {
  try {
    const { id } = req.params;  // ✅ Fixed: req.params.id
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID format'
      });
    }

    const todo = await Todo.findOne({ _id: id, author: userId });  // ✅ Check ownership

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to view it'
      });
    }

    return res.status(200).json({
      success: true,
      data: todo,
      message: "Todo fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching todo:', error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching todo"
    });
  }
};

// ADDITIONAL: Get todos by completion status
const getCompletedTodos = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isCompleted } = req.query;
    
    const query = { author: userId };
    if (isCompleted !== undefined) {
      query.isCompleted = isCompleted === 'true';
    }

    const todos = await Todo.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: todos,
      message: "Todos fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching todos:', error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Add this new function for search and filter
const searchTodos = async (req, res) => {
  try {
    const { q, status, priority, fromDate, toDate } = req.query;
    const userId = req.user.userId;
    
    // Build query
    const query = { author: userId };
    
    // Text search on tasks and authorName
    if (q && q.trim()) {
      query.$or = [
        { tasks: { $regex: q.trim(), $options: 'i' } },
        { authorName: { $regex: q.trim(), $options: 'i' } }
      ];
    }
    
    // Filter by completion status
    if (status !== undefined) {
      query.isCompleted = status === 'true';
    }
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
    }
    
    // Filter by date range
    if (fromDate || toDate) {
      query.dueDate = {};
      if (fromDate) {
        query.dueDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.dueDate.$lte = new Date(toDate);
      }
    }
    
    const todos = await Todo.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return res.status(200).json({
      success: true,
      data: todos,
      count: todos.length,
      message: "Search completed successfully"
    });
    
  } catch (error) {
    console.log('Error searching todos:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during search"
    });
  }
};

// CREATE TODO WITH FILES
const createtodo = async (req, res) => {
  try {
    const { tasks, dueDate, priority } = req.body;
    const userId = req.user.userId;
    const uploadedFiles = req.uploadedFiles || [];

    if (!tasks || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one task'
      });
    }

    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newtodo = await Todo.create({
      author: userId,
      authorName: user.name || user.username,
      tasks,
      dueDate: dueDate || null,
      priority: priority || 'medium',
      attachments: uploadedFiles.map(file => ({
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        url: file.url,
        optimized: file.optimized || false
      }))
    });

    logger.info(`Todo created with ${uploadedFiles.length} attachments by user ${userId}`);

    return res.status(201).json({
      success: true,
      data: newtodo,
      message: 'Todo created successfully',
      files: uploadedFiles
    });

  } catch (error) {
    logger.error('Error creating todo with files:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating todo'
    });
  }
};

// UPDATE TODO WITH FILES
const updatetodo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tasks, dueDate, isCompleted, priority } = req.body;
    const userId = req.user.userId;
    const uploadedFiles = req.uploadedFiles || [];

    const existingTodo = await Todo.findOne({ _id: id, author: userId });
    
    if (!existingTodo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to update it'
      });
    }

    const updateData = {};
    if (tasks) updateData.tasks = tasks;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (priority) updateData.priority = priority;

    // Add new attachments if any
    if (uploadedFiles.length > 0) {
      const newAttachments = uploadedFiles.map(file => ({
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        url: file.url,
        optimized: file.optimized || false
      }));
      
      updateData.$push = { attachments: { $each: newAttachments } };
    }

    const updatedtodo = await Todo.findByIdAndUpdate(
      id,
      updateData,
      { 
        returnDocument: 'after',
        runValidators: true 
      }
    );

    logger.info(`Todo ${id} updated with ${uploadedFiles.length} new attachments`);

    return res.status(200).json({
      success: true,
      data: updatedtodo,
      message: 'Todo updated successfully',
      files: uploadedFiles
    });

  } catch (error) {
    logger.error('Error updating todo:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating todo'
    });
  }
};

// DELETE TODO WITH FILES
const deletetodo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const todo = await Todo.findOne({ _id: id, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to delete it'
      });
    }

    // Delete all attachment files
    if (todo.attachments && todo.attachments.length > 0) {
      for (const attachment of todo.attachments) {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
          logger.info(`Deleted file: ${attachment.path}`);
        }
      }
      
      // Delete user's upload directory if empty
      const userUploadPath = path.join(__dirname, '../../uploads', userId.toString());
      if (fs.existsSync(userUploadPath)) {
        const files = fs.readdirSync(userUploadPath);
        if (files.length === 0) {
          fs.rmdirSync(userUploadPath);
          logger.info(`Deleted empty directory: ${userUploadPath}`);
        }
      }
    }

    const deletedtodo = await Todo.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      data: deletedtodo,
      message: "Todo and associated files deleted successfully"
    });

  } catch (error) {
    logger.error('Error deleting todo:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting todo'
    });
  }
};

// DELETE ATTACHMENT
const deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.userId;

    const todo = await Todo.findOne({ _id: id, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    // Find attachment
    const attachmentIndex = todo.attachments.findIndex(
      a => a._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Delete file from disk
    const attachment = todo.attachments[attachmentIndex];
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
      logger.info(`Deleted attachment: ${attachment.path}`);
    }

    // Remove attachment from todo
    todo.attachments.splice(attachmentIndex, 1);
    await todo.save();

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      data: todo
    });

  } catch (error) {
    logger.error('Error deleting attachment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting attachment'
    });
  }
};

// DOWNLOAD ATTACHMENT
const downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.userId;

    const todo = await Todo.findOne({ _id: id, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const attachment = todo.attachments.find(
      a => a._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set download headers
    res.download(attachment.path, attachment.originalName, (err) => {
      if (err) {
        logger.error('Download error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
      
      logger.info(`File downloaded: ${attachment.originalName} by user ${userId}`);
    });

  } catch (error) {
    logger.error('Error downloading attachment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error downloading file'
    });
  }
};

// GET ATTACHMENT INFO
const getAttachmentInfo = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.userId;

    const todo = await Todo.findOne({ _id: id, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const attachment = todo.attachments.find(
      a => a._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(attachment.path);
    const fileInfo = {
      ...attachment.toObject(),
      fileExists: fs.existsSync(attachment.path),
      fileSize: stats.size,
      lastModified: stats.mtime,
    };

    return res.status(200).json({
      success: true,
      data: fileInfo,
      message: 'Attachment info retrieved'
    });

  } catch (error) {
    logger.error('Error getting attachment info:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// BULK UPLOAD (Additional utility)
const bulkUpload = async (req, res) => {
  try {
    const { todoId } = req.params;
    const userId = req.user.userId;
    const uploadedFiles = req.uploadedFiles || [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const todo = await Todo.findOne({ _id: todoId, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const newAttachments = uploadedFiles.map(file => ({
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: file.url,
      optimized: file.optimized || false
    }));

    todo.attachments.push(...newAttachments);
    await todo.save();

    return res.status(200).json({
      success: true,
      data: todo,
      files: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`
    });

  } catch (error) {
    logger.error('Error in bulk upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error uploading files'
    });
  }
};

module.exports = {
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
};
