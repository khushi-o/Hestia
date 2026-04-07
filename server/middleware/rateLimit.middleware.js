const rateLimit = require("express-rate-limit");

/** Stricter limits on unauthenticated auth endpoints (abuse / credential stuffing). */
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, try again later." },
});

/** Smart search (OpenAI) — per IP, only applied when `?nl=1`. */
const nlSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many smart searches. Try again in a minute.",
  },
});

function nlSearchRateLimit(req, res, next) {
  if (req.query.nl !== "1") return next();
  return nlSearchLimiter(req, res, next);
}

module.exports = { authWriteLimiter, nlSearchRateLimit };
