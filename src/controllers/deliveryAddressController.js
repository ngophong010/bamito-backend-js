const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  createAddress,
  deleteAddress,
  updateAddress,
  getAddressesForUser,
  setAddressAsDefault,
} = require("../services/deliveryAddressService.js");

/**
 * @desc    Create a new delivery address for the logged-in user
 * @route   POST /api/profile/addresses
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req - Express request object, augmented with user property.
 * @param {import('express').Response} res - Express response object.
 */
const handleCreateAddress = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Get the userId from the authenticated token for security
  // An authentication middleware should guarantee req.user exists.
  const userId = req.user.id;
  const newAddress = await createAddress(userId, req.body);
  
  // Send the response with a Vietnamese message for the user
  res.status(201).json({ 
    message: "Thêm địa chỉ giao hàng thành công.", 
    data: newAddress 
  });
});

/**
 * @desc    Get all delivery addresses for the logged-in user
 * @route   GET /api/profile/addresses
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req - Express request object, augmented with user property.
 * @param {import('express').Response} res - Express response object.
 */
const handleGetAddressesForUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const addresses = await getAddressesForUser(userId);
  res.status(200).json(addresses);
});

/**
 * @desc    Update a specific delivery address
 * @route   PUT /api/addresses/:id
 * @access  Private (Owner)
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
const handleUpdateAddress = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const addressId = Number(req.params.id);
  const updatedAddress = await updateAddress(addressId, req.body);

  res.status(200).json({
    message: "Cập nhật địa chỉ thành công.",
    data: updatedAddress
  });
});

/**
 * @desc    Delete a specific delivery address
 * @route   DELETE /api/addresses/:id
 * @access  Private (Owner)
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
const handleDeleteAddress = asyncHandler(async (req, res) => {
  const addressId = Number(req.params.id);
  // Note: An `isAddressOwner` middleware should be used here to verify ownership.
  await deleteAddress(addressId);
  res.status(204).send(); // Standard for successful DELETE with no content to return.
});

/**
 * @desc    Set a specific address as the default for the logged-in user
 * @route   PATCH /api/addresses/:id/set-default
 * @access  Private (Owner)
 * @param {import('express').Request & { user?: { id: number } }} req - Express request object, augmented with user property.
 * @param {import('express').Response} res - Express response object.
 */
const handleSetAddressAsDefault = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const addressId = Number(req.params.id);

  const newDefaultAddress = await setAddressAsDefault(userId, addressId);
  
  res.status(200).json({
    message: "Đặt làm địa chỉ mặc định thành công.",
    data: newDefaultAddress
  });
});

module.exports = {
    handleCreateAddress,
    handleGetAddressesForUser,
    handleUpdateAddress,
    handleDeleteAddress,
    handleSetAddressAsDefault
};