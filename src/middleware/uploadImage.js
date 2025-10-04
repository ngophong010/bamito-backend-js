/**
 * @fileoverview This file configures the Multer middleware for handling file uploads.
 * It uses 'multer-storage-cloudinary' to stream files directly to Cloudinary,
 * ensuring the application remains scalable and stateless.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary.js'); // Import the PRE-CONFIGURED instance
const AppError = require('../utils/AppError.js'); // Import custom error class

// 1. Configure the Cloudinary Storage Engine
// This engine handles the logic of streaming the file directly to Cloudinary.
const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // Use the configured Cloudinary instance
  params: {
    // @ts-ignore
    folder: (req, file) => 'bamito-shop', // The name of the folder in Cloudinary
    
    // You can also dynamically set the public_id (filename) in Cloudinary
    // public_id: (req, file) => `product-${Date.now()}-${file.originalname}`,
    
    // Optional: Add transformations, tags, etc.
    // transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

// 2. Create the file filter to validate file types.
const fileFilter = (req, file, cb) => {
  // Check if the file's mimetype is one of the allowed image types
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true); // Accept the file
  } else {
    // Reject the file and pass a specific AppError to our global error handler.
    cb(new AppError('File type not supported! Please upload a JPG or PNG image.', 400), false);
  }
};

// 3. Create the final Multer middleware instance with the correct storage.
const uploadImage = multer({
  storage: storage, // Use the Cloudinary storage engine, NOT memoryStorage
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5 MB file size limit
  }
});

/**
 * A dedicated error handler for Multer-specific errors.
 * This should be used in a route chain right after the Multer middleware.
 * @param {Error} err - The error object, potentially from Multer.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file too large).
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ status: 'fail', message: 'File is too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ status: 'fail', message: err.message });
    } else if (err) {
        // An unknown error occurred (e.g., our custom fileFilter error).
        return res.status(400).json({ status: 'fail', message: err.message });
    }
    // If no error, proceed
    next();
};

module.exports = {
    uploadImage,
    handleMulterError,
};
