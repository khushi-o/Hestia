const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Socket.io handshake: auth.token (preferred) or Authorization Bearer header.
 */
async function socketAuthMiddleware(socket, next) {
  try {
    let token = socket.handshake.auth?.token;
    if (!token) {
      const h = socket.handshake.headers?.authorization;
      if (h && h.startsWith("Bearer ")) token = h.slice(7);
    }
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("Unauthorized"));
    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}

module.exports = { socketAuthMiddleware };
