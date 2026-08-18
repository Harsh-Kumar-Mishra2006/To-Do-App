const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for different levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// File rotation format (no colors for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
  }),
  
  // Error log file rotation
  new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
  }),
  
  // All logs file rotation
  new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
  }),
];

// Create logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create stream for Morgan integration
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// Logging utilities
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info(`📥 ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
  });
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`📤 ${req.method} ${req.url} - ${statusCode} (${duration}ms)`, {
      statusCode,
      duration,
      contentLength: res.get('content-length'),
    });
  });
  
  next();
};

// Error logging
const logError = (error, req = null, context = '') => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  
  if (req) {
    errorData.request = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId,
      body: req.body,
      query: req.query,
      params: req.params,
    };
  }
  
  logger.error(`❌ ${error.message}`, errorData);
};

// Performance logging
const logPerformance = (operation, duration, metadata = {}) => {
  logger.info(`⚡ ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...metadata,
  });
};

// Security logging
const logSecurity = (event, user = null, metadata = {}) => {
  logger.warn(`🔒 Security Event: ${event}`, {
    event,
    user: user?.userId || 'anonymous',
    userRole: user?.role || 'none',
    ...metadata,
  });
};

module.exports = {
  logger,
  logRequest,
  logError,
  logPerformance,
  logSecurity,
};