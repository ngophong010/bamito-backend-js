/**
 * @fileoverview This utility file contains helper functions for creating and verifying
 * JSON Web Tokens (JWTs). It abstracts the `jsonwebtoken` library and centralizes
 * token secrets and expiration settings.
 */

const jwt = require('jsonwebtoken');

/**
 * @typedef {object} UserPayload
 * @property {number} id - The user's unique identifier.
 * @property {string} role - The user's role identifier (e.g., 'R1', 'ADMIN').
 */

// --- Environment Variable Validation ---
// Best Practice: This check should ideally be in a central `config/env.js` file
// that runs once at application startup to validate ALL required environment variables.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_KEY; // I've used your previously defined ACCESS_KEY
const REFRESH_TOKEN_SECRET = process.env.REFRESH_KEY; // and REFRESH_KEY
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '15m';
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("FATAL ERROR: JWT secrets are not defined in the environment variables!");
}

// ===============================================================
// --- TOKEN GENERATION ---
// ===============================================================

/**
 * Generates a short-lived Access Token for a user.
 * @param {UserPayload} payload The user data to include in the token.
 * @returns {string} The signed JWT Access Token string.
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });
};

/**
 * Generates a long-lived Refresh Token for a user.
 * @param {UserPayload} payload The user data to include in the token.
 * @returns {string} The signed JWT Refresh Token string.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });
};

// ===============================================================
// --- TOKEN VERIFICATION ---
// ===============================================================

/**
 * Verifies an Access Token.
 * @param {string} token The JWT string to verify.
 * @returns {UserPayload} The decoded payload if the token is valid.
 * @throws {Error} If the token is invalid or expired.
 */
const verifyAccessToken = (token) => {
  try {
    // The `jwt.verify` function returns the decoded payload.
    // In JS, we trust it matches the UserPayload structure.
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    // The library throws errors like JsonWebTokenError or TokenExpiredError.
    // We can let these bubble up to be caught by our central errorHandler.
    // The error handler can then check `error.name` to provide a specific message.
    throw error;
  }
};

/**
 * Verifies a Refresh Token.
 * @param {string} token The JWT string to verify.
 * @returns {UserPayload} The decoded payload if the token is valid.
 * @throws {Error} If the token is invalid or expired.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw error;
  }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
