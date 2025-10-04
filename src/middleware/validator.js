/**
 * @fileoverview This file contains middleware to handle validation results
 * from express-validator.
 */

const { validationResult } = require('express-validator');

/**
 * Checks for validation errors and sends a 400 response if any are found.
 * If validation passes, it calls the next middleware.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    // If there are validation errors...
    if (!errors.isEmpty()) {
        // Send a 400 Bad Request response with the mapped errors.
        // The JSend 'fail' status is a good practice for client-side errors.
        return res.status(400).json({ status: 'fail', data: errors.mapped() });
    }

    // If no errors, proceed to the next middleware (usually the controller).
    next();
};

module.exports = {
    handleValidationErrors,
};
