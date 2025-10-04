const asyncHandler = require('express-async-handler');

// Import the service functions. The logic inside these functions changes between ORMs,
// but the controller's interface with them remains the same.
const {
  getProfile,
  updateProfile,
  changePasswordInProfile,
} = require('../services/userService.js');

/**
 * @desc    Get the profile of the currently logged-in user.
 * @route   GET /api/profile
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property by auth middleware.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetProfile = asyncHandler(async (req, res) => {
    // Get the user ID from the authenticated token for security, not from params or body.
    const userId = req.user.id;
    const profileData = await getProfile(userId);
    res.status(200).json({ status: 'success', data: profileData });
});

/**
 * @desc    Update the profile of the currently logged-in user.
 * @route   PUT /api/profile
 * @access  Private
 * @param {import('express').Request & { user?: { id: number }, file?: any }} req The Express request object, with user and optional file properties.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    // The service layer will handle the file upload logic internally.
    const updatedProfile = await updateProfile(userId, req.body, req.file);
    res.status(200).json({ status: 'success', data: updatedProfile });
});

/**
 * @desc    Change the password for the currently logged-in user.
 * @route   PATCH /api/profile/change-password
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleChangePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    await changePasswordInProfile(userId, currentPassword, newPassword);
    // For actions that don't return data, sending a success message is often clearer.
    res.status(200).json({ status: 'success', message: "Password changed successfully." });
});

module.exports = {
    handleGetProfile,
    handleUpdateProfile,
    handleChangePassword,
};
