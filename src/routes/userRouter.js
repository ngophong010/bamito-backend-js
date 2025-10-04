/**
 * @fileoverview This file defines the API routes for user management.
 * It includes routes for the logged-in user to manage their own profile,
 * and admin-only routes for full CRUD operations on all users.
 */

const express = require("express");
const { body, param } = require('express-validator');

const {
  handleGetUserInfo,
  handleChangeProfilePassword,
  handleCreateUserByAdmin,
  handleUpdateUser,
  handleDeleteUser,
  handleGetAllUsers,
  handleGetAllRoles,
} = require("../controllers/userController.js");

// Import handler for the nested favourites route
const { handleGetFavouritedProductsByUser } = require("../controllers/favouriteController.js");

const { protect, isAdmin } = require("../middleware/auth.js");
const { uploadImage } = require("../middleware/uploadImage.js");

const router = express.Router();

// --- Validation Chains ---
const updateUserValidation = [
    body('email', 'A valid email is required').optional().isEmail().normalizeEmail(),
    body('userName', 'User name is required').optional().not().isEmpty().trim(),
    // Add other fields an admin or user can update, e.g., phoneNumber, birthday
];

const changePasswordValidation = [
    body('currentPassword', 'Current password is required').not().isEmpty(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
];

const idParamValidation = [
  param('id', 'A numeric user ID is required in the URL path').isNumeric(),
];

const userIdParamValidation = [
    param('userId', 'A numeric user ID is required in the URL path').isNumeric(),
];

// ===============================================================
// --- USER PROFILE ROUTES (Actions on your OWN account) ---
// ===============================================================

// Get the profile of the currently logged-in user
// NOTE: A more RESTful route would be GET /api/profile, handled by a profile router.
// This is kept here for structural consistency with the original file.
router.get("/profile", protect, handleGetUserInfo);

// Update the profile of the currently logged-in user
// NOTE: The controller for this route should get the user ID from `req.user.id`, not `req.params.id`.
router.put("/profile", protect, uploadImage.single('avatar'), updateUserValidation, handleUpdateUser);

// Change the password of the currently logged-in user
router.put(
    "/profile/change-password",
    protect,
    changePasswordValidation,
    handleChangeProfilePassword
);

// ===============================================================
// --- ADMIN-ONLY ROUTES (Actions on ANY user) ---
// ===============================================================

// All routes below require admin privileges
router.use(protect, isAdmin);

router.route("/")
    .get(handleGetAllUsers)
    .post(handleCreateUserByAdmin); // Validation should be added here

// Routes for a specific user, identified by their numeric primary key
router.route("/:id")
    .put(uploadImage.single('avatar'), idParamValidation, updateUserValidation, handleUpdateUser)
    .delete(idParamValidation, handleDeleteUser);

// Route to get a list of all available roles
router.get("/roles/all", handleGetAllRoles);

// Route for an admin to get favourites for a specific user
router.get('/:userId/favourites', userIdParamValidation, handleGetFavouritedProductsByUser);

module.exports = router;