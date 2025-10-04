const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");

const { 
  createBrand, 
  getAllBrands,
  updateBrand, 
  deleteBrand,  
} = require("../services/brandService.js");

/**
 * @desc    Create a new brand
 * @route   POST /api/v1/brands
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateBrand = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // This is a "fail" response according to JSend
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }
  
  // The service now returns the created object directly on success
  const newBrand = await createBrand(req.body);

  // The controller's job is just to send the success response
  res.status(201).json({ status: "success", data: newBrand });
});

/**
 * @desc    Get all brands (paginated or full list)
 * @route   GET /api/v1/brands
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllBrands = asyncHandler(async (req, res) => {
  const { limit, page, sort, name } = req.query;
  // Default pagination to true if the query param is not 'false'
  const pagination = req.query.pagination !== 'false'; 

  // The service now returns the data object directly
  // Convert query params to their expected types before passing
  const brandData = await getAllBrands(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    name,
    pagination
  );

  res.status(200).json({ status: "success", data: brandData });
});

/**
 * @desc    Update a brand
 * @route   PUT /api/v1/brands/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateBrand = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // This is a "fail" response according to JSend
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }
  
  // Best practice: Get the ID from the URL parameters, not the body.
  const id = Number(req.params.id);
  const updatedBrand = await updateBrand(id, req.body);

   res.status(200).json({ status: "success", data: updatedBrand });
});

/**
 * @desc    Delete a brand
 * @route   DELETE /api/v1/brands/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteBrand = asyncHandler(async (req, res) => {
  // Best practice: Get the ID from the URL parameters.
  const id = Number(req.params.id);
  await deleteBrand(id);
  
  // Best practice for DELETE is to return a 204 No Content response.
  res.status(204).send();
});

module.exports = {
  handleCreateBrand,
  handleGetAllBrands,
  handleUpdateBrand,
  handleDeleteBrand,
};