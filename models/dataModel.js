//dataModel.js
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
  }
}, { 
  timestamps: true
});

module.exports = mongoose.model('Todo', todoSchema);