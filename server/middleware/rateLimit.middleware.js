const rateLimit = require("express-rate-limit");

/** Stricter limits on unauthenticated auth endpoints (abuse / credential stuffing). */
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, try again later." },
});

module.exports = { authWriteLimiter };
