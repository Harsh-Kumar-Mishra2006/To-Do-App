const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true,
  },
  authorName: {
    type: String,
    required: true,
    trim: true
  },
  tasks: {
    type: [String],
    required: true,
    validate: {
      validator: function(value) {
        return value && value.length > 0;
      },
      message: 'Tasks array cannot be empty'
    }
  },
  dueDate: {
    type: Date,
    required: false,
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    optimized: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Add index for file queries
todoSchema.index({ 'attachments.uploadedAt': -1 });
todoSchema.index({ author: 1, 'attachments.uploadedAt': -1 });

module.exports = mongoose.model('Todo', todoSchema);