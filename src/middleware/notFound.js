/**
 * @fileoverview This middleware handles requests for routes that do not exist.
 * It creates a 404 error and passes it to the central error handler.
 */

const AppError = require('../utils/AppError'); // Import your custom error class

/**
 * Catches requests for non-existent routes.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const notFound = (req, res, next) => {
  // Create an AppError instance with a 404 status code
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  // Pass the error to the next middleware in the chain (which will be our global error handler)
  next(error);
};

module.exports = notFound;
