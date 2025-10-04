/**
 * @fileoverview This file contains the database configuration for Sequelize.
 * It uses environment variables to configure connections for development,
 * test, and production environments. It is compatible with the Sequelize-CLI.
 */

// Best practice: Load environment variables from a .env file
require('dotenv').config();

/**
 * @typedef {import('sequelize').Dialect} Dialect
 * @typedef {import('sequelize').PoolOptions} PoolOptions
 */

/**
 * @typedef {object} DbConfig
 * @property {string} username - The database username.
 * @property {string | null} [password] - The database password.
 * @property {string} database - The name of the database.
 * @property {string} host - The database host.
 * @property {number} port - The database port.
 * @property {Dialect} dialect - The SQL dialect of the database (e.g., 'postgres', 'mysql').
 * @property {object} [dialectOptions] - Dialect-specific options.
 * @property {object} [dialectOptions.ssl] - SSL configuration for the connection.
 * @property {boolean} dialectOptions.ssl.require - If true, requires SSL.
 * @property {boolean} dialectOptions.ssl.rejectUnauthorized - If false, allows self-signed certificates.
 * @property {PoolOptions} [pool] - Connection pool options.
 */

/**
 * @typedef {object} AppConfig
 * @property {DbConfig} development
 * @property {DbConfig} test
 * @property {DbConfig} production
 */

/**
 * The main configuration object for Sequelize.
 * @type {AppConfig}
 */
const config = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5433,
    dialect: "postgres",
  },
  test: {
    username: "root",
    password: null,
    database: "database_test",
    host: "127.0.0.1",
    dialect: "postgres",
    port: 5432,
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5433,
    dialect: "postgres",

    // ENHANCEMENT: Add dialectOptions for production-grade SSL connections
    // This is often required by cloud database providers like Heroku, Vercel, AWS RDS, etc.
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // This may be needed for some cloud providers
      },
    },
    // ENHANCEMENT: Configure the connection pool for production
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
};

module.exports = config;