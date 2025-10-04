const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  createOrder,
  cancelOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderDetail,
  getAllOrdersForUser,
  getAllOrdersForAdmin,
  getStatistics,
  getSalesReport,
} = require("../services/orderService.js");

// ===============================================================
// --- USER-FACING ACTIONS ---
// ===============================================================

/**
 * @desc    Create a new order for the logged-in user.
 * @route   POST /api/orders
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateOrder = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  };
  
  // Get userId from the authenticated token for security.
  // An auth middleware should ensure req.user exists.
  const userId = req.user.id;
  const newOrder = await createOrder({ ...req.body, userId });
  res.status(201).json({ status: "success", data: newOrder });
});

/**
 * @desc    Get all orders for the currently logged-in user.
 * @route   GET /api/profile/orders
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const status = req.query.status ? Number(req.query.status) : undefined;
  const { limit, page } = req.query;

  const orderData = await getAllOrdersForUser(
      userId, 
      status, 
      limit ? Number(limit) : undefined, 
      page ? Number(page) : undefined
  );
  res.status(200).json({ status: "success", data: orderData });
});

/**
 * @desc    Allows a user to cancel their own order.
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Owner)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCancelOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  // Note: An `isOrderOwner` middleware would verify ownership before this handler is called.
  await cancelOrder(orderId);
  res.status(200).json({ status: "success", message: "Order cancelled successfully." });
});

// ===============================================================
// --- ADMIN-ONLY ACTIONS ---
// ===============================================================

/**
 * @desc    [ADMIN] Get all orders from all users.
 * @route   GET /api/orders
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllOrdersForAdmin = asyncHandler(async (req, res) => {
  const status = req.query.status ? Number(req.query.status) : undefined;
  const { limit, page } = req.query;

  const orderData = await getAllOrdersForAdmin(
      status, 
      limit ? Number(limit) : undefined, 
      page ? Number(page) : undefined
  );
  res.status(200).json({ status: "success", data: orderData });
});

/**
 * @desc    [ADMIN] Get the full details of a single order.
 * @route   GET /api/orders/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetOrderDetail = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const orderDetails = await getOrderDetail(orderId);
  res.status(200).json({ status: "success", data: orderDetails });
});

/**
 * @desc    [ADMIN] Update the status of an order.
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateOrderStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { 
      return res.status(400).json({ errors: errors.array() });
  };

  const orderId = Number(req.params.id);
  const { status } = req.body;
  const updatedOrder = await updateOrderStatus(orderId, status);
  res.status(200).json({ status: "success", data: updatedOrder });
});

/**
 * @desc    [ADMIN] Delete an order.
 * @route   DELETE /api/orders/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  await deleteOrder(orderId);
  res.status(204).send();
});

/**
 * @desc    [ADMIN] Get sales and user statistics.
 * @route   GET /api/statistics
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetStatistics = asyncHandler(async (req, res) => {
  const stats = await getStatistics();
  res.status(200).json({ status: "success", data: stats });
});

/**
 * @desc    [ADMIN] Get a sales report for a given time period.
 * @route   GET /api/reports/sales
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetSalesReport = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  };

  const { timeStart, timeEnd, limit, page } = req.query;
  const reportData = await getSalesReport(
    new Date(timeStart),
    new Date(timeEnd),
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined
  );
  res.status(200).json({ status: "success", data: reportData });
});

module.exports = {
    handleCreateOrder,
    handleGetUserOrders,
    handleCancelOrder,
    handleGetAllOrdersForAdmin,
    handleGetOrderDetail,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleGetStatistics,
    handleGetSalesReport
};