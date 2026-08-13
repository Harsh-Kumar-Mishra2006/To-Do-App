//dataController.js
const mongoose = require('mongoose');
const Todo = require('../models/dataModel');
const Auth = require('../models/authModel');

// CREATE TODO - ✅ Fixed with user reference
const createtodo = async (req, res) => {
  try {
    const { tasks, dueDate, priority } = req.body;
    const userId = req.user.userId;  // From authenticated user

    if (!tasks || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one task'
      });
    }

    // Get user details for authorName
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
      priority: priority || 'medium'
    });

    return res.status(201).json({  // ✅ 201 for creation
      success: true,
      data: newtodo,
      message: 'Todo created successfully'
    });

  } catch (error) {
    console.log('Error creating todo:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating todo'
    });
  }
};

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

// UPDATE TODO - ✅ Fixed with ownership check
const updatetodo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tasks, dueDate, isCompleted, priority } = req.body;
    const userId = req.user.userId;

    // First check if todo exists and belongs to user
    const existingTodo = await Todo.findOne({ _id: id, author: userId });
    
    if (!existingTodo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to update it'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (tasks) updateData.tasks = tasks;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (priority) updateData.priority = priority;

    const updatedtodo = await Todo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedtodo,
      message: 'Todo updated successfully'
    });

  } catch (error) {
    console.log('Error updating todo:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating todo'
    });
  }
};

// DELETE TODO - ✅ Fixed with ownership check
const deletetodo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if todo exists and belongs to user
    const todo = await Todo.findOne({ _id: id, author: userId });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found or you do not have permission to delete it'
      });
    }

    const deletedtodo = await Todo.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      data: deletedtodo,
      message: "Todo deleted successfully"
    });

  } catch (error) {
    console.log('Error deleting todo:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting todo'
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

module.exports = {
  createtodo,
  getalltodo,
  updatetodo,
  deletetodo,
  gettodobyId,
  getCompletedTodos,  
  searchTodos 
};