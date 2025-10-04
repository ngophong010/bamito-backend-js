const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { v2: cloudinary } = require('cloudinary');

const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductDetails,
  getAllProducts,
  getAllProductsByCategory,
  getAllProductsOnSale,
} = require("../services/productService.js");

/**
 * @desc    Create a new product with an image upload.
 * @route   POST /api/products
 * @access  Private (Admin)
 * @param {import('express').Request & { file?: any }} req The Express request object, augmented with a file property from multer.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If validation fails, a file may have been uploaded via multer. Clean it up.
    if (req.file) await cloudinary.uploader.destroy(req.file.filename);
    return res.status(400).json({ errors: errors.array() });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'An image file is required.' });
  }

  try {
    const data = {
      ...req.body,
      image: req.file.path,
      imageId: req.file.filename,
    };
    
    // The service now returns the created product directly
    const newProduct = await createProduct(data);
    res.status(201).json({ status: "success", data: newProduct });

  } catch (error) {
    // If the service throws ANY error (e.g., duplicate productId),
    // we must clean up the file that was successfully uploaded to Cloudinary.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    // Re-throw the error to be caught by our global errorHandler middleware
    throw error;
  }
});

/**
 * @desc    Update an existing product, optionally with a new image.
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 * @param {import('express').Request & { file?: any }} req The Express request object, augmented with an optional file property.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await cloudinary.uploader.destroy(req.file.filename);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = Number(req.params.id);
    // The service now handles the logic of replacing the old image if a new one is provided.
    const updatedProduct = await updateProduct(id, req.body, req.file);
    res.status(200).json({ status: "success", data: updatedProduct });
  } catch (error) {
    // If the service fails for any reason, clean up the newly uploaded file.
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    throw error;
  }
});

/**
 * @desc    Delete a product and its associated image from Cloudinary.
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  // The service now handles deleting the image from Cloudinary internally.
  await deleteProduct(id);
  res.status(204).send(); // Standard for successful DELETE
});

// --- PUBLIC-FACING PRODUCT QUERIES ---

/**
 * @desc    Get the full details of a single product.
 * @route   GET /api/products/:productId
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const productDetails = await getProductDetails(productId);
  res.status(200).json({ status: "success", data: productDetails });
});

/**
 * @desc    Get a list of all products with filtering, sorting, and pagination.
 * @route   GET /api/products
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllProducts = asyncHandler(async (req, res) => {
  const { limit, page, sort, name } = req.query;
  const productData = await getAllProducts(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    name
  );
  res.status(200).json({ status: "success", data: productData });
});

/**
 * @desc    Get products belonging to a specific category.
 * @route   GET /api/categories/:categoryId/products
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllProductsByCategory = asyncHandler(async (req, res) => {
  const { limit, page, sort, filter } = req.query;
  const { categoryId } = req.params; // Using categoryId from URL param is more RESTful

  const productData = await getAllProductsByCategory(
    Number(categoryId),
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    filter // Should be validated and parsed in the service layer
  );
  res.status(200).json({ status: "success", data: productData });
});

/**
 * @desc    Get a paginated list of all products currently on sale.
 * @route   GET /api/products/on-sale
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllProductsOnSale = asyncHandler(async (req, res) => {
    const { limit, page } = req.query;
    const saleData = await getAllProductsOnSale(
        limit ? Number(limit) : undefined,
        page ? Number(page) : undefined,
    );
    res.status(200).json({ status: "success", data: saleData });
});

module.exports = {
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleGetProductDetails,
  handleGetAllProducts,
  handleGetAllProductsByCategory,
  handleGetAllProductsOnSale,
};
