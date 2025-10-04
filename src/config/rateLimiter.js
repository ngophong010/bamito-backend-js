/**
 * @fileoverview This file defines rate-limiting rules for various parts of the API
 * to prevent abuse and ensure service stability.
 */

const rateLimit = require('express-rate-limit');

// General-purpose limiter for most API routes.
// Allows a reasonable number of requests for normal application use.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// A stricter limiter for sensitive authentication routes.
// This helps prevent brute-force attacks on login and registration.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window for auth actions
  message: { message: "Too many authentication attempts from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// A very strict limiter for actions like password reset requests.
// This prevents an attacker from spamming users' emails.
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 password reset requests per hour
    message: { message: "Too many password reset requests from this IP, please try again after an hour." },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
};
