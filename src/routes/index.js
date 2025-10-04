/**
 * @fileoverview This is the master router file for the entire API.
 * It consolidates all resource-specific routers (users, products, etc.)
 * and mounts them under a versioned namespace (e.g., /api/v1).
 * Any middleware applied here will run for all API routes.
 */

const express = require("express");

const authRouter = require("./authRouter.js");
const profileRouter = require('./profileRouter.js');
const userRouter = require("./userRouter.js");
const productRouter = require("./productRouter.js");
const categoryRouter = require("./categoryRouter.js");
const brandRouter = require("./brandRouter.js");
const { sizesRouter, categorySizesRouter } = require("./sizeRouter.js");
const voucherRouter = require("./voucherRouter.js");
const inventoryRouter = require("./inventoryRouter.js");
const feedbackRouter = require("./feedbackRouter.js");
const orderRouter = require("./orderRouter.js");
const paymentRouter = require("./paymentRouter.js");
const addressRouter = require('./addressRouter.js'); 

const apiRouter = express.Router();

// --- ENHANCEMENT 2: Add any middleware that should apply to ALL API routes ---
// This simple logger will run for every single API request, which is great for debugging.
apiRouter.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Request received: ${req.method} ${req.originalUrl}`);
  }
  next();
});

// --- ENHANCEMENT 1: Create a versioned router ---
const v1Router = express.Router();

// Mount all your resource routers onto the v1Router
v1Router.use("/auth", authRouter);
v1Router.use("/profile", profileRouter); // For logged-in user's own data
v1Router.use("/users", userRouter);       // For admin management of users
v1Router.use("/categories", categoryRouter);
v1Router.use("/products", productRouter);
v1Router.use("/brands", brandRouter);
v1Router.use("/sizes", sizesRouter);
v1Router.use("/vouchers", voucherRouter);
v1Router.use("/inventory", inventoryRouter);
v1Router.use("/feedback", feedbackRouter);
v1Router.use("/orders", orderRouter);
v1Router.use("/payment", paymentRouter);
v1Router.use('/addresses', addressRouter);

// Mount the versioned router onto the main apiRouter
apiRouter.use("/v1", v1Router);

module.exports = apiRouter;
