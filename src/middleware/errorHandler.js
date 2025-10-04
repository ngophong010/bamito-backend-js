/**
 * @fileoverview This is the global error handling middleware for the application.
 * It catches all errors passed via `next(error)` and sends a standardized,
 * safe JSON response to the client.
 */

/**
 * The main error handling function.
 * @param {Error & { statusCode?: number, status?: string, isOperational?: boolean }} err - The error object.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
    // Set default status code and status message
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error for debugging purposes
    console.error('ERROR 💥', err);

    if (process.env.NODE_ENV === 'production') {
        // --- PRODUCTION ERRORS: Send generic, safe messages ---

        // Handle specific, known errors (e.g., from Sequelize or JWT)
        let error = { ...err, message: err.message };
        
        // Example: Handle Sequelize unique constraint error
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path;
            const message = `Duplicate field value entered for: ${field}. Please use another value.`;
            error = new AppError(message, 400); // Using a custom AppError class is best
        }
        
        // Example: Handle JWT invalid signature error
        if (error.name === 'JsonWebTokenError') {
            error = new AppError('Invalid token. Please log in again.', 401);
        }

        // Example: Handle JWT expired error
        if (error.name === 'TokenExpiredError') {
            error = new AppError('Your session has expired. Please log in again.', 401);
        }

        // Send a generic response for all other operational errors
        // The 'isOperational' flag comes from our AppError class
        if (error.isOperational) {
            return res.status(error.statusCode).json({
                status: error.status,
                message: error.message,
            });
        }
        
        // For non-operational errors (bugs), send a generic message
        console.error('PROGRAMMING_ERROR 💥', err);
        // For unknown, programming errors, don't leak details
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });

    } else {
        // --- DEVELOPMENT ERRORS: Send detailed information ---
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = errorHandler;
