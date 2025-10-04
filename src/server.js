/**
 * @fileoverview This is the main entry point for the Express application.
 * It is responsible for validating the environment, connecting to the database,
 * assembling all middleware, mounting the master API router, and starting the server.
 */

// 1. VALIDATE ENVIRONMENT & LOAD CONFIGS (CRITICAL: Do this first!)
// This ensures all required environment variables are present before any other code runs.
const { validateEnv } = require('./config/validateEnv.js');
validateEnv();

// 2. IMPORT CORE MODULES
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

// 3. IMPORT APPLICATION-SPECIFIC MODULES & CONFIGURATIONS
const { connectDB, sequelize } = require("./config/connectDB.js");
const configuredCors = require('./config/cors.js');
const { generalLimiter } = require('./config/rateLimiter.js');
const apiRouter = require("./routes/index.js");
const notFound = require('./middleware/notFound.js');
const errorHandler = require('./middleware/errorHandler.js');

// 4. INITIALIZE THE EXPRESS APP
const app = express();

// 5. APPLY CORE MIDDLEWARE
// Sets various security-related HTTP headers to protect the application.
app.use(helmet());

// Configures Cross-Origin Resource Sharing with a dynamic whitelist.
app.use(configuredCors);

// Parses incoming JSON payloads. Sets a reasonable body size limit.
app.use(express.json({ limit: "500kb" }));

// Parses URL-encoded data from forms.
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Parses cookies attached to the client request.
app.use(cookieParser());

// 6. APPLY API-SPECIFIC MIDDLEWARE
// Applies a general rate limiter to all routes starting with /api.
app.use("/api", generalLimiter);

// 7. MOUNT THE MASTER API ROUTER
// All application routes are consolidated under the /api path.
app.use("/api", apiRouter);

// 8. REGISTER ERROR HANDLING MIDDLEWARE (CRITICAL: Must be last!)
// Handles requests for routes that don't exist (404).
app.use(notFound);

// The global error handler. Catches all errors passed by next(error).
app.use(errorHandler);

// 9. DEFINE SERVER STARTUP LOGIC
const port = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // Test the database connection first.
    await connectDB();
    
    // Optional but recommended: Sync database models in development.
    // Use { alter: true } to non-destructively update tables. Avoid in production.
    if (process.env.NODE_ENV === 'development') {
        // await sequelize.sync({ alter: true });
    }

    // Start listening for incoming HTTP requests.
    app.listen(port, () => {
      console.log(`🚀 Server is running in ${process.env.NODE_ENV} mode on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    process.exit(1); // Exit the process with a failure code
  }
};

startServer();
