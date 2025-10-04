/**
 * @fileoverview A higher-order function to wrap async route handlers,
 * catching any rejected promises and passing them to Express's error handling middleware.
 */

/**
 * Wraps an asynchronous function to catch errors and pass them to next().
 * @param {Function} fn The asynchronous controller function to wrap.
 * @returns {Function} A new function that can be used as an Express route handler.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    // The .catch(next) will automatically pass any error from the promise chain
    // into the 'next' function, which triggers the global error handler.
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
