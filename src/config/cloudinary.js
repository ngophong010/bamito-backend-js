/**
 * @fileoverview This file initializes and configures the Cloudinary SDK.
 * It reads credentials from environment variables and exports the configured
 * instance for use throughout the application (e.g., in upload middleware).
 */

const { v2: cloudinary } = require('cloudinary');

// Note: The 'validateEnv.js' file should have already run and confirmed
// that these environment variables exist.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Recommended to force HTTPS
});

module.exports = cloudinary;