const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/Database');
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');
const likeCommentRoutes = require('./routes/Like&CommentRoutes');
const mongoose = require('mongoose');

// Import logger
const { logger, logRequest, logError, logSecurity } = require('./src/utils/logger');

const app = express();

// ✅ Security Middleware
app.use(helmet());
app.use(compression());

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ✅ Connect to Database with logging
connectDB()
  .then(() => {
    logger.info('✅ Database connected successfully');
  })
  .catch((error) => {
    logError(error, null, 'Database Connection');
    process.exit(1);
  });

// ✅ Request Logging
app.use(logRequest);

// ✅ Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Health Check API with logging
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    server: {
      status: 'running',
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'Not connected',
      database: mongoose.connection.name || 'Not connected',
    },
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024,
    },
  };

  logger.info('Health check performed', { status: healthStatus.status });
  
  if (mongoose.connection.readyState !== 1) {
    healthStatus.status = 'DEGRADED';
    return res.status(503).json(healthStatus);
  }

  res.status(200).json(healthStatus);
});

// ✅ Detailed Health Check
app.get('/api/health/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
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
        platform: process.platform,
      },
      database: {
        status: 'connected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        ping: dbTest.ok === 1 ? 'successful' : 'failed',
        readyState: mongoose.connection.readyState,
      },
      memory: {
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      },
      routes: {
        total: 3,
        auth: '/api/auth',
        todo: '/api/todo',
        comments: '/api/likecomment',
      },
    };

    logger.info('Detailed health check performed', { responseTime });
    res.status(200).json(healthStatus);
  } catch (error) {
    logError(error, req, 'Health Check');
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'disconnected',
        error: error.message,
      },
    });
  }
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/todo', dataRoutes);
app.use('/api/likecomment', likeCommentRoutes);

// ✅ Global Error Handler with logging
app.use((err, req, res, next) => {
  logError(err, req, 'Global Error Handler');
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors,
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ✅ 404 handler with logging
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ✅ Start server with logging
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`✅ Server running on port: ${PORT}`);
  logger.info(`📍 http://localhost:${PORT}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`📊 Detailed health: http://localhost:${PORT}/api/health/detailed`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server };