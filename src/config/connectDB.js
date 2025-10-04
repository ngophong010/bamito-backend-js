/**
 * @fileoverview This file initializes the Sequelize instance.
 * It reads the configuration for the current environment from config.js,
 * creates a connection instance, and provides a function to test the database connection.
 */

const { Sequelize, Options } = require("sequelize");
const config = require("./config.js");

// Determine the current environment, defaulting to 'development'
const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

// Throw an error if the configuration for the current environment is not found
if (!dbConfig) {
  throw new Error(`Database configuration for environment "${env}" not found.`);
}

/**
 * The configuration options for the Sequelize constructor, built dynamically.
 * This pattern ensures that no keys with `undefined` values are passed.
 * @type {Options}
 */
const sequelizeOptions = {
  username: dbConfig.username,
  database: dbConfig.database,
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
};

// Conditionally add each optional property to the options object ONLY if it exists.
if (dbConfig.password) {
  sequelizeOptions.password = dbConfig.password;
}
if (dbConfig.dialectOptions) {
  sequelizeOptions.dialectOptions = dbConfig.dialectOptions;
}
if (dbConfig.pool) {
  sequelizeOptions.pool = dbConfig.pool;
}

/**
 * The global Sequelize instance, configured for the current environment.
 * @type {Sequelize}
 */
const sequelize = new Sequelize(sequelizeOptions);

/**
 * Establishes and tests the connection to the database.
 * If the connection fails, it logs the error and exits the application process.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Connection to the ${env} database has been established successfully.`);
  } catch (error) {
    console.error(`❌ Unable to connect to the ${env} database:`);
    // Use a type guard to safely access error properties
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }
    process.exit(1); // Exit process with failure
  }
};

module.exports = {
  sequelize,
  connectDB,
};