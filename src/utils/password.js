/**
 * @fileoverview This utility file contains helper functions for password hashing
 * and comparison using the bcryptjs library. It abstracts the hashing logic
 * and centralizes the salt round configuration.
 */

const bcrypt = require('bcryptjs');

// The cost factor for hashing. 10 is a good default balance between
// security and performance. This value should be in a single place.
const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} password The plain-text password to hash.
 * @returns {Promise<string>} A promise that resolves to the hashed password string.
 * @throws {Error} If the password is empty.
 */
const hashPassword = async (password) => {
  if (!password) {
    throw new Error("Password cannot be empty.");
  }
  // bcrypt.genSalt and bcrypt.hash are asynchronous operations
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

/**
 * Compares a plain-text password with a hashed password.
 * @param {string} plainPassword The plain-text password from a user's login attempt.
 * @param {string} hashedPassword The hashed password stored in the database.
 * @returns {Promise<boolean>} A promise that resolves to true if the passwords match, false otherwise.
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  // Avoid errors by checking for empty inputs, which would always fail comparison anyway.
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  // bcrypt.compare is an asynchronous operation designed to be resistant to timing attacks.
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
