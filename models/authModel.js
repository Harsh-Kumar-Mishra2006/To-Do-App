//models/authModel.js
const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,  // ✅ Add unique constraint
  },
  email: {
    type: String,
    required: true,
    unique: true,  // ✅ Add unique constraint
    lowercase: true, // ✅ Normalize email
  },
  phone: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: { 
    type: String, 
    enum: ['owner','visitor'], 
    required: true,
  }
}, { 
  timestamps: true  // ✅ Fixed: lowercase
});

module.exports = mongoose.model('Auth', authSchema);