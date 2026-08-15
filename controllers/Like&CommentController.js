//Like&CommentController.js
const mongoose = require('mongoose');
const LikeComment = require('../models/Like&CommentModel');
const Todo = require('../models/dataModel');

//  CREATE COMMENT - Fixed with todo and user reference
const createComment = async (req, res) => {
  try {
    const { todoId, comment } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name || req.user.username;

    if (!todoId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Todo ID and comment are required'
      });
    }

    //  Check if todo exists
    const todo = await Todo.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const newComment = await LikeComment.create({
      todoId,
      userId,
      userName,
      comment,
    });

    return res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.log('Error adding comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

//  GET ALL COMMENTS - Fixed with pagination
const getAllComments = async (req, res) => {
  try {
    const { todoId, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (todoId) {
      query.todoId = todoId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const allComments = await LikeComment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalComments = await LikeComment.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: allComments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
        totalComments,
        limit: parseInt(limit),
      },
      message: "Comments fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//  UPDATE COMMENT - Fixed with ownership check
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    //  Check ownership
    const existingComment = await LikeComment.findOne({ _id: id, userId });
    
    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or you do not have permission to update it'
      });
    }

    const updatedComment = await LikeComment.findByIdAndUpdate(
      id,
      { comment },
      { returnDocument: 'after', runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    });

  } catch (error) {
    console.log('Error updating comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

//  DELETE COMMENT - Fixed with ownership check
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    //  Check ownership
    const comment = await LikeComment.findOne({ _id: id, userId });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or you do not have permission to delete it'
      });
    }

    const deletedComment = await LikeComment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      data: deletedComment,
      message: "Comment deleted successfully"
    });

  } catch (error) {
    console.log('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

//  GET COMMENT BY ID - Fixed
const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID format'
      });
    }

    const comment = await LikeComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: comment,
      message: "Comment fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching comment:', error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//  LIKE COMMENT - Fixed with proper save
const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const comment = await LikeComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    //  Check if user already liked
    const alreadyLiked = comment.likedBy.includes(userId);
    const alreadyDisliked = comment.dislikedBy.includes(userId);

    if (alreadyLiked) {
      // Remove like
      comment.like -= 1;
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Add like
      comment.like += 1;
      comment.likedBy.push(userId);

      // Remove dislike if exists
      if (alreadyDisliked) {
        comment.dislike -= 1;
        comment.dislikedBy = comment.dislikedBy.filter(id => id.toString() !== userId.toString());
      }
    }

    //  Save to database
    await comment.save();

    return res.status(200).json({
      success: true,
      data: {
        likes: comment.like,
        dislikes: comment.dislike,
        likedBy: comment.likedBy,
        dislikedBy: comment.dislikedBy,
      },
      message: alreadyLiked ? 'Like removed successfully' : 'Like added successfully'
    });

  } catch (error) {
    console.log('Error adding like:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing like'
    });
  }
};

//  DISLIKE COMMENT - Fixed with proper save
const dislikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const comment = await LikeComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    //  Check if user already disliked
    const alreadyDisliked = comment.dislikedBy.includes(userId);
    const alreadyLiked = comment.likedBy.includes(userId);

    if (alreadyDisliked) {
      // Remove dislike
      comment.dislike -= 1;
      comment.dislikedBy = comment.dislikedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Add dislike
      comment.dislike += 1;
      comment.dislikedBy.push(userId);

      // Remove like if exists
      if (alreadyLiked) {
        comment.like -= 1;
        comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId.toString());
      }
    }

    //  Save to database
    await comment.save();

    return res.status(200).json({
      success: true,
      data: {
        likes: comment.like,
        dislikes: comment.dislike,
        likedBy: comment.likedBy,
        dislikedBy: comment.dislikedBy,
      },
      message: alreadyDisliked ? 'Dislike removed successfully' : 'Dislike added successfully'
    });

  } catch (error) {
    console.log('Error adding dislike:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing dislike'
    });
  }
};

//  GET RESPONSES - Fixed duplicate field
const getResponses = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID is required'
      });
    }

    const comment = await LikeComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        likes: comment.like,
        dislikes: comment.dislike,
        likedBy: comment.likedBy,
        dislikedBy: comment.dislikedBy,  //  Fixed duplicate
        totalReactions: comment.like + comment.dislike,
      },
      message: "Responses fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching responses:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching responses',
    });
  }
};

//  GET COMMENTS BY TODO - New helper function
const getCommentsByTodo = async (req, res) => {
  try {
    const { todoId } = req.params;
    
    const comments = await LikeComment.find({ todoId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: comments,
      total: comments.length,
      message: "Comments fetched successfully"
    });

  } catch (error) {
    console.log('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Add search comments function
const searchComments = async (req, res) => {
  try {
    const { q, todoId, userName } = req.query;
    
    const query = {};
    
    // Search by comment text
    if (q && q.trim()) {
      query.comment = { $regex: q.trim(), $options: 'i' };
    }
    
    // Filter by todo
    if (todoId) {
      query.todoId = todoId;
    }
    
    // Filter by user
    if (userName) {
      query.userName = { $regex: userName.trim(), $options: 'i' };
    }
    
    const comments = await LikeComment.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return res.status(200).json({
      success: true,
      data: comments,
      count: comments.length,
      message: "Comments search completed"
    });
    
  } catch (error) {
    console.log('Error searching comments:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during search"
    });
  }
};

module.exports = {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
  getResponses,
  getCommentsByTodo,  
  searchComments
};