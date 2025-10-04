const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { v2: cloudinary } = require('cloudinary');

const {
  createVoucher,
  deleteVoucher,
  updateVoucher,
  getAllVouchers,
  getActiveVouchersForUser,
} = require("../services/voucherService.js");

/**
 * @desc    Create a new voucher, optionally with an image.
 * @route   POST /api/vouchers
 * @access  Private (Admin)
 * @param {import('express').Request & { file?: any }} req The Express request object, augmented with an optional file property from multer.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateVoucher = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If validation fails, a file may have been uploaded. Clean it up.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const data = {
      ...req.body,
      image: req.file?.path,
      imageId: req.file?.filename,
    };

    // The service now returns the created voucher object directly.
    const newVoucher = await createVoucher(data);
    res.status(201).json({ status: "success", data: newVoucher });

  } catch (error) {
    // If ANY error is thrown from the service (e.g., duplicate ID),
    // clean up the uploaded file.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    // Re-throw the error to be caught by the global error handler middleware.
    throw error;
  }
});

/**
 * @desc    Get all vouchers with filtering, sorting, and pagination.
 * @route   GET /api/vouchers
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllVouchers = asyncHandler(async (req, res) => {
  const { limit, page, sort, name, pagination } = req.query;

  const voucherData = await getAllVouchers(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    name,
    pagination !== 'false' // Default to true
  );

  res.status(200).json({ status: "success", data: voucherData });
});

/**
 * @desc    Get all currently active and valid vouchers for a user.
 * @route   GET /api/vouchers/active
 * @access  Public (or Private if user-specific)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetActiveVouchersForUser = asyncHandler(async (req, res) => {
  const activeVouchers = await getActiveVouchersForUser();
  res.status(200).json({ status: "success", data: activeVouchers });
});

/**
 * @desc    Update an existing voucher.
 * @route   PUT /api/vouchers/:id
 * @access  Private (Admin)
 * @param {import('express').Request & { file?: any }} req The Express request object, augmented with an optional file property.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateVoucher = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await cloudinary.uploader.destroy(req.file.filename);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = Number(req.params.id);
    const data = {
      ...req.body,
      // Optional chaining is safe here; if req.file is undefined, these will be too.
      image: req.file?.path,
      imageId: req.file?.filename,
    };

    const updatedVoucher = await updateVoucher(id, data);
    res.status(200).json({ status: "success", data: updatedVoucher });

  } catch (error) {
    // If the service throws (e.g., voucher not found, duplicate ID),
    // clean up the newly uploaded file.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    throw error;
  }
});

/**
 * @desc    Delete a voucher by its ID.
 * @route   DELETE /api/vouchers/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteVoucher = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const id = Number(req.params.id);
  // The service now handles both Cloudinary deletion and DB deletion.
  await deleteVoucher(id);
  // 204 No Content is standard for successful DELETE.
  res.status(204).send(); 
});

module.exports = {
  handleCreateVoucher,
  handleGetAllVouchers,
  handleGetActiveVouchersForUser,
  handleUpdateVoucher,
  handleDeleteVoucher,
};
