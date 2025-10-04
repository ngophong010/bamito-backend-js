/**
 * @fileoverview Defines a custom Error class for handling operational,
 * predictable errors in the application.
 */

/**
 * Custom error class to create operational errors with a specific
 * status code and message.
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message The error message.
   * @param {number} statusCode The HTTP status code to be sent in the response.
   */
  constructor(message, statusCode) {
    // Call the parent constructor with the error message
    super(message);

    /**
     * The HTTP status code for this error.
     * @type {number}
     */
    this.statusCode = statusCode;

    /**
     * A string indicating the status ('fail' for 4xx, 'error' for 5xx).
     * @type {string}
     */
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    /**
     * A flag to distinguish operational errors (expected issues) from
     * programming errors (bugs).
     * @type {boolean}
     */
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
