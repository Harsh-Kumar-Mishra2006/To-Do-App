const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const {connectDB} = require('./config/Database');
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');
const likeCommentRoutes = require('./routes/Like&CommentRoutes');
const mongoose = require('mongoose'); // Import mongoose for DB check

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Health Check API
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    server: {
      status: 'running',
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'Not connected',
      database: mongoose.connection.name || 'Not connected'
    },
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024
    }
  };

  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    healthStatus.status = 'DEGRADED';
    healthStatus.database.status = 'disconnected';
    return res.status(503).json(healthStatus);
  }

  res.status(200).json(healthStatus);
});

// ✅ Detailed Health Check with DB operations
app.get('/api/health/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database query
    const dbTest = await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;

    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      server: {
        status: 'running',
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        status: 'connected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        ping: dbTest.ok === 1 ? 'successful' : 'failed',
        readyState: mongoose.connection.readyState
      },
      memory: {
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
      },
      routes: {
        total: 3,
        auth: '/api/auth',
        todo: '/api/todo',
        comments: '/api/likecomment'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// Routes
app.use('/api/todo', dataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/likecomment', likeCommentRoutes);

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Detailed health: http://localhost:${PORT}/api/health/detailed`);
});