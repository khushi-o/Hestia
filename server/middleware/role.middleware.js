/** Block portal clients from agency-only CRM routes. */
function requireAgency(req, res, next) {
  if (req.user?.role === "client") {
    return res.status(403).json({ message: "Not available for client accounts" });
  }
  next();
}

module.exports = { requireAgency };
