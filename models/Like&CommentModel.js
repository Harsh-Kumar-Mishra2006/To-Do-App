const mongoose = require('mongoose');

const LikeCommentSchema = new mongoose.Schema({
  todoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Todo',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500, 
  },
  like: {
    type: Number,
    default: 0,  
  },
  dislike: {
    type: Number,
    default: 0, 
  },
  likedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Auth',
    default: [],
  },
  dislikedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Auth',
    default: [],
  },
}, {
  timestamps: true,
});

LikeCommentSchema.index({ todoId: 1, createdAt: -1 });
LikeCommentSchema.index({ userId: 1 });

module.exports = mongoose.model('LikeComment', LikeCommentSchema);