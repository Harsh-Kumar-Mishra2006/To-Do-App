const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { logger } = require('./logger');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.userId || 'anonymous';
    const uploadPath = path.join(__dirname, '../../uploads', userId);
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per upload
  }
});

// Image optimization middleware
const optimizeImage = async (filePath, outputPath) => {
  try {
    await sharp(filePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    // Remove original file
    fs.unlinkSync(filePath);
    
    return true;
  } catch (error) {
    logger.error('Image optimization failed:', error);
    return false;
  }
};

// File upload middleware with optimization
const handleFileUpload = async (req, res, next) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return next();
    }

    const optimizedFiles = [];
    
    for (const file of files) {
      const fileInfo = {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        url: `/uploads/${req.user.userId}/${file.filename}`
      };

      // Optimize images
      if (file.mimetype.startsWith('image/')) {
        const optimizedPath = file.path.replace(/\.[^.]+$/, '-optimized.jpg');
        const optimized = await optimizeImage(file.path, optimizedPath);
        
        if (optimized) {
          fileInfo.path = optimizedPath;
          fileInfo.url = `/uploads/${req.user.userId}/${path.basename(optimizedPath)}`;
          fileInfo.optimized = true;
        }
      }

      optimizedFiles.push(fileInfo);
    }

    req.uploadedFiles = optimizedFiles;
    next();
  } catch (error) {
    logger.error('File upload error:', error);
    next(error);
  }
};

// Get file info
const getFileInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    
    return {
      filename: path.basename(filePath),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: ext.slice(1),
      isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase())
    };
  } catch (error) {
    logger.error('Error getting file info:', error);
    return null;
  }
};

// Delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file: ${filePath}`, error);
    return false;
  }
};

// Delete all files in a directory
const deleteDirectory = (dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      logger.info(`Directory deleted: ${dirPath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting directory: ${dirPath}`, error);
    return false;
  }
};

module.exports = {
  upload,
  handleFileUpload,
  getFileInfo,
  deleteFile,
  deleteDirectory,
  fileFilter
};