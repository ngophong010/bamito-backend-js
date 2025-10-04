/**
 * @fileoverview This file defines the RESTful API routes for the Role resource.
 * It includes routes for creating, reading, updating, and deleting user roles.
 * All routes are protected and require administrator privileges.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');

// Import the full suite of controller handlers
const {
  handleGetAllRoles,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
} = require('../controllers/roleController.js');

const { protect, isAdmin } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const createValidation = [
  body('roleId', 'A numeric roleId is required').isNumeric(),
  body('roleName', 'A non-empty roleName is required').isString().notEmpty().trim(),
];

const updateValidation = [
  body('roleId', 'roleId must be numeric').optional().isNumeric(),
  body('roleName', 'roleName must be a non-empty string').optional().isString().notEmpty().trim(),
];

const idParamValidation = [
  param('id', 'A numeric ID is required in the URL path').isNumeric(),
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

// Apply admin protection to all routes in this file
router.use(protect, isAdmin);

router.route('/')
  /**
   * @route   GET /api/v1/roles
   * @desc    Get all user roles
   * @access  Private (Admin)
   */
  .get(handleGetAllRoles)
  /**
   * @route   POST /api/v1/roles
   * @desc    Create a new user role
   * @access  Private (Admin)
   */
  .post(createValidation, handleCreateRole);
  
router.route('/:id')
  /**
   * @route   PUT /api/v1/roles/:id
   * @desc    Update a user role by its numeric ID
   * @access  Private (Admin)
   */
  .put(idParamValidation, updateValidation, handleUpdateRole)
  /**
   * @route   DELETE /api/v1/roles/:id
   * @desc    Delete a user role by its numeric ID
   * @access  Private (Admin)
   */
  .delete(idParamValidation, handleDeleteRole);

module.exports = router;