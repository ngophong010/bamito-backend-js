/**
 * @fileoverview This file contains the CORS (Cross-Origin Resource Sharing)
 * configuration for the application. It defines which origins are allowed to
 * access the API, with different settings for development and production.
 */

const cors = require('cors');

// Define a whitelist of allowed origins.
// In production, this should ONLY be your frontend's domain.
const allowedOrigins = [
    process.env.URL_CLIENT, // Your production frontend URL from .env
];

// In development, we want to allow requests from tools like Postman and local servers.
if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000'); // Example for a local React app
    allowedOrigins.push('http://localhost:5173'); // Example for a local Vite app
}

const corsOptions = {
  /**
   * The origin function determines which origins are allowed.
   * @param {string | undefined} origin - The origin of the incoming request.
   * @param {(err: Error | null, allow?: boolean) => void} callback - The callback to resolve the check.
   */
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // If the origin is in our whitelist, allow it.
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Otherwise, disallow it.
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  
  // This is important for allowing cookies/authorization headers to be sent
  credentials: true,
};

// Export the configured cors middleware
module.exports = cors(corsOptions);