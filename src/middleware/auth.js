/**
 * @fileoverview This file contains all authentication and authorization middleware.
 * It is responsible for verifying user identity (authentication) and checking
 * their permissions to access specific resources (authorization).
 */

const asyncHandler = require('express-async-handler');
const { verifyAccessToken } = require('../utils/jwt.js'); // Assuming you have this helper
const { User, Order, Feedback, DeliveryAddress } = require('../models'); // Import your Sequelize models
const ROLES = require('../config/roles.js'); // Import the role constants
const AppError = require('../utils/AppError.js'); // Import a custom Error class

// ====================================================================
//  1. AUTHENTICATION MIDDLEWARE (The Gatekeeper)
// ====================================================================

/**
 * Verifies JWT and attaches a full, fresh user object to the request.
 * This is the primary authentication middleware.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    // Pass a specific error to the centralized error handler.
    return next(new AppError("Not authorized, no token provided.", 401));
  }

  // 1. Verify the token to get the user ID.
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return next(new AppError("Not authorized, token failed verification.", 401));
  }

  // 2. **CRITICAL ENHANCEMENT**: Fetch the user from the database.
  // This ensures the user still exists and is active.
  const currentUser = await User.findOne({
    where: { id: decoded.id, status: 1 }, // Ensure user is active
    attributes: ['id', 'roleId'], // Only fetch what's needed for auth
  });

  if (!currentUser) {
    return next(new AppError("The user belonging to this token no longer exists.", 401));
  }

  // 3. Attach the fresh, validated user object to the request.
  req.user = currentUser;

  // 4. Grant access to the next middleware/controller.
  next();
});

// ====================================================================
//  2. AUTHORIZATION MIDDLEWARES (The Bouncers)
// ====================================================================

/**
 * Generic authorization middleware to check for specific roles.
 * Use it like: `router.get('/', protect, restrictTo('R1', 'R2'), handler)`
 * @param {...string} roles - A list of role IDs that are allowed access.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.roleId)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
};

// You can now create specific middleware by reusing restrictTo for better readability.
const isAdmin = restrictTo(ROLES.ADMIN);
const isStaff = restrictTo(ROLES.STAFF);

// ====================================================================
//  OWNERSHIP-BASED AUTHORIZATION 
// ====================================================================

/**
 * Middleware Factory: Checks if the logged-in user is the owner of a resource.
 * This is for USER-FACING routes (e.g., /profile/orders/:id).
 * @param {import('sequelize').ModelCtor<Model>} Model - The Sequelize model to check.
 * @param {string} [foreignKey='userId'] - The foreign key on the model linking to the user.
 */
const isOwner = (Model, foreignKey = 'userId') =>
    asyncHandler(async (req, res, next) => {
        const resourceId = Number(req.params.id);
        const userId = req.user.id;

        if (!resourceId) {
            return next(new AppError("Resource ID not found in URL parameters.", 400));
        }

        const resource = await Model.findOne({
            where: {
                id: resourceId,
                [foreignKey]: userId,
            },
            attributes: ['id'] // We only need to know if it exists
        });

        if (!resource) {
            return next(new AppError("Forbidden. You do not have permission to access this resource.", 403));
        }
        
        next();
    });

/**
 * A highly reusable middleware factory for checking resource ownership.
 * @param {import('sequelize').ModelCtor<Model>} Model - The Sequelize model to check (e.g., Order, Feedback).
 * @param {string} [foreignKey='userId'] - The name of the foreign key on the model that links to the user.
 * @returns {function} An Express middleware function.
 */
const isOwnerOrAdmin = (Model, foreignKey = 'userId') => 
  asyncHandler(async (req, res, next) => {
    // Admins can always proceed. This check runs after `protect`.
    if (req.user.roleId === ROLES.ADMIN) {
        return next();
    }

    const resourceId = Number(req.params.id);
    const userId = req.user.id;

    if (!resourceId) {
        return next(new AppError("Resource ID not found in URL parameters.", 400));
    }
    
    // Check if a record exists that matches BOTH the resource ID and the user's ID.
    const resource = await Model.findOne({
        where: {
            id: resourceId,
            [foreignKey]: userId, // e.g., { userId: 123 }
        }
    });

    if (!resource) {
        return next(new AppError("Forbidden. You do not have permission to access this resource.", 403));
    }

    // Attach the found resource to the request to prevent the controller from querying it again.
    req.resource = resource; 
    next();
});

// Create specific, readable middleware by calling the factory.
const isOrderOwnerOrAdmin = isOwnerOrAdmin(Order);
const isFeedbackOwnerOrAdmin = isOwnerOrAdmin(Feedback);
const isOrderOwner = isOwner(Order); 
const isAddressOwner = isOwnerOrAdmin(DeliveryAddress);

module.exports = {
    protect,
    isAdmin,
    isStaff,
    restrictTo,
    isOrderOwnerOrAdmin,
    isFeedbackOwnerOrAdmin,
    isOrderOwner,
    isAddressOwner
};
