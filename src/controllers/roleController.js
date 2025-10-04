/**
 * @fileoverview This controller handles the HTTP layer for Role management.
 * It receives requests, calls the appropriate service functions for CRUD operations,
 * and sends back HTTP responses.
 */

const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');


const {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
} = require("../services/roleService.js");

/**
 * @desc    Get all user roles
 * @route   GET /api/v1/roles
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllRoles = asyncHandler(async (req, res) => {
  // The service layer handles all the database logic.
  const roles = await getAllRoles();
  // The controller's job is to format and send the final HTTP response.
  res.status(200).json({ status: "success", data: roles });
});

/**
 * @desc    Create a new user role
 * @route   POST /api/v1/roles
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateRole = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: "fail", data: errors.mapped() });
    }

    const newRole = await createRole(req.body);
    res.status(201).json({ status: "success", data: newRole });
});

/**
 * @desc    Update an existing user role
 * @route   PUT /api/v1/roles/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateRole = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: "fail", data: errors.mapped() });
    }

    const roleId = Number(req.params.id);
    const updatedRole = await updateRole(roleId, req.body);
    res.status(200).json({ status: "success", data: updatedRole });
});

/**
 * @desc    Delete a user role
 * @route   DELETE /api/v1/roles/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteRole = asyncHandler(async (req, res) => {
    const roleId = Number(req.params.id);
    await deleteRole(roleId);
    // Standard response for a successful DELETE is 204 No Content
    res.status(204).send();
});

module.exports = {
    handleGetAllRoles,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
};
