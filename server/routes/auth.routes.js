const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const Project = require("../models/project.model");
const Invoice = require("../models/invoice.model");
const Client = require("../models/client.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

router.post("/register", register);
router.post("/login", login);

// Stats
router.get("/stats", protect, async (req, res) => {
  try {
    const [projects, clients, invoices] = await Promise.all([
      Project.countDocuments({ owner: req.user._id }),
      Client.countDocuments({ owner: req.user._id }),
      Invoice.find({ owner: req.user._id }),
    ]);
    const pendingInvoices = invoices.filter(
      (inv) => inv.status === "Draft" || inv.status === "Sent"
    ).length;
    const totalRevenue = invoices
      .filter((inv) => inv.status === "Paid")
      .reduce((sum, inv) => sum + inv.total, 0);
    const recentProjects = await Project.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name status progress");
    res.json({ projects, clients, pendingInvoices, totalRevenue, recentProjects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (email) user.email = email;
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Current password is incorrect" });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;