const { validationResult } = require('express-validator');
const asyncHandler = require("express-async-handler");
const { v2: cloudinary } = require('cloudinary');

const {
  createUserByAdmin,
  deleteUser,
  updateUser,
  getUserInfo,
  getAllUsers,
  changePasswordInProfile,
  getAllRoles,
  sendSmsOtp,
  checkEmailExists,
} = require("../services/userService.js");

// ===============================================================
// --- USER PROFILE & INFO ---
// ===============================================================

/**
 * @desc    Get information for a specific user.
 * @route   GET /api/users/:id
 * @access  Private (Admin or Owner)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetUserInfo = asyncHandler(async (req, res) => {
  // Best practice: In a real app, get ID from req.user for profile, or req.params for admin lookup.
  const userId = Number(req.params.id); 

  const userInfo = await getUserInfo(userId);
  res.status(200).json({ status: "success", data: userInfo });
});

/**
 * @desc    Allows a logged-in user to change their own password.
 * @route   PATCH /api/profile/change-password
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleChangeProfilePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  };

  const userId = req.user.id; // Get ID from authenticated token
  const { currentPassword, newPassword } = req.body;
  await changePasswordInProfile(userId, currentPassword, newPassword);
  res.status(200).json({ status: "success", message: "Password changed successfully." });
});

// ===============================================================
// --- ADMIN USER MANAGEMENT (CRUD) ---
// ===============================================================

/**
 * @desc    [ADMIN] Create a new user.
 * @route   POST /api/users
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateUserByAdmin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const newUser = await createUserByAdmin(req.body);
  res.status(201).json({ status: "success", data: newUser });
});

/**
 * @desc    [ADMIN] Get a list of all users with filtering and pagination.
 * @route   GET /api/users
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllUsers = asyncHandler(async (req, res) => {
  const { limit, page, sort, name } = req.query;
  const usersData = await getAllUsers(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    name
  );
  res.status(200).json({ status: "success", data: usersData });
});

/**
 * @desc    [ADMIN] Update a user's information.
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 * @param {import('express').Request & { file?: any }} req The Express request object, augmented with an optional file property.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await cloudinary.uploader.destroy(req.file.filename);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = Number(req.params.id);
    const updatedUser = await updateUser(id, req.body, req.file);
    res.status(200).json({ status: "success", data: updatedUser });
  } catch (error) {
    // If the service throws ANY error (not found, duplicate email, etc.),
    // clean up the newly uploaded file before letting the errorHandler take over.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    throw error; // Re-throw the error
  }
});

/**
 * @desc    [ADMIN] Delete a user.
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await deleteUser(id);
  res.status(204).send(); // Standard for successful DELETE
});

// ===============================================================
// --- UTILITY & MISC ---
// ===============================================================

/**
 * @desc    Check if an email is already in use.
 * @route   GET /api/users/check-email
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCheckEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ message: "Invalid or missing email parameter." });
  }
  const exists = await checkEmailExists(email);
  // Return a simple, clear boolean response
  res.status(200).json({ exists });
});

/**
 * @desc    Send an SMS OTP to a user's phone for verification.
 * @route   POST /api/users/send-otp
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleSendSmsOtp = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Get ID from authenticated token
  const result = await sendSmsOtp(userId);
  res.status(200).json({ status: "success", data: result });
});

/**
 * @desc    Get a list of all available user roles.
 * @route   GET /api/roles
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllRoles = asyncHandler(async (req, res) => {
  const roles = await getAllRoles();
  res.status(200).json({ status: "success", data: roles });
});


module.exports = {
  handleGetUserInfo,
  handleChangeProfilePassword,
  handleCreateUserByAdmin,
  handleGetAllUsers,
  handleUpdateUser,
  handleDeleteUser,
  handleGetAllRoles,
  handleSendSmsOtp,
  handleCheckEmail
};
