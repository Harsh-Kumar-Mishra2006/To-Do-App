//controllers/authController.js
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');  // ✅ Import bcryptjs
const jwt = require('jsonwebtoken');   // ✅ Import JWT
const auth = require('../models/authModel');
const { authValidation } = require('../validations/validation');

const JWT_SECRET = process.env.JWT_SECRET || 'mypassword';

// Updated Signup with validation
const Signup = async (req, res) => {
  try {
    // ✅ Validate input
    const { error } = authValidation.signup(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(err => err.message)
      });
    }

    const { name, username, email, phone, password, role } = req.body;

    // Check existing user
    const existingUser = await auth.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already registered'
      });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    // Create user
    const createuser = await auth.create({
      name,
      username,
      email: email.toLowerCase(),
      phone,
      password: hashPassword,
      role
    });

    // Generate token
    const token = jwt.sign(
      { 
        userId: createuser._id, 
        email: createuser.email, 
        username: createuser.username,
        role: createuser.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set cookie
    res.cookie('token', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(201).json({
      success: true,
      data: {
        userId: createuser._id,
        name: createuser.name,
        email: createuser.email,
        username: createuser.username,
        phone: createuser.phone,
        role: createuser.role
      },
      message: 'User created successfully'
    });

  } catch (error) {
    console.log('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating user, try again'
    });
  }
};

// Updated Login with validation
const Login = async (req, res) => {
  try {
    // ✅ Validate input
    const { error } = authValidation.login(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(err => err.message)
      });
    }

    const { username, email, password } = req.body;

    // Find user
    const existingUser = await auth.findOne({
      $or: [
        { email: email?.toLowerCase() }, 
        { username: username }
      ]
    });

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await bcryptjs.compare(password, existingUser.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set cookie
    res.cookie('token', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(200).json({
      success: true,
      data: {
        userId: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        username: existingUser.username,
        phone: existingUser.phone,
        role: existingUser.role
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.log('Error authenticating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Login error, try again'
    });
  }
};


// GET PROFILE - ✅ Fixed
const getProfile = async (req, res) => {
  try {
    // Get token from header or cookie
    let token = req.header('Authorization') || req.cookies?.token;  // ✅ Fixed spelling

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Clean token
    token = token.replace('Bearer ', '').trim();  // ✅ Fixed
    token = token.replace(/^["']|["']$/g, '');

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);  // ✅ Fixed
      console.log('Token verified for user:', decoded.userId);

      const user = await auth.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: {
          userId: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role:user.role
        }
      });

    } catch (jwtError) {
      console.log('Error verifying token:', jwtError);
      return res.status(401).json({  // ✅ Fixed: 401
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.log('Error getting profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error, try again'
    });
  }
};

// LOGOUT - ✅ Fixed
const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.log('Error logging out:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout error, try again'
    });
  }
};

module.exports = {
  Signup,
  Login,
  getProfile,
  logout
};