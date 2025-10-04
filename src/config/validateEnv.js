/**
 * @fileoverview This file is responsible for loading and validating environment variables.
 * It ensures that all required variables are present at application startup,
 * preventing runtime errors due to missing configuration.
 */

// Load environment variables from a .env file into process.env
// This should be one of the first lines executed in your application.
require('dotenv').config();

/**
 * Checks for the presence of all required environment variables at startup.
 * If a required variable is not defined, it throws a fatal error,
 * crashing the application to prevent it from running in a misconfigured state.
 * @throws {Error} If a required environment variable is missing.
 */
const validateEnv = () => {
  const requiredEnv = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'ACCESS_KEY',
    'REFRESH_KEY',
    'VNP_TMNCODE',
    'VNP_HASHSECRET',
    'VNP_URL',
    'VNP_RETURNURL',
    'URL_CLIENT'
  ];

  for (const variable of requiredEnv) {
    if (!process.env[variable]) {
      // If a variable is missing, throw a clear error and crash the app.
      // This is a "fail-fast" approach, which is good practice.
      throw new Error(`FATAL ERROR: Environment variable ${variable} is not defined.`);
    }
  }
};

/**
 * A configuration object for Cloudinary, derived from validated environment variables.
 */
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

module.exports = {
  validateEnv,
  cloudinaryConfig,
};
