const express = require("express");
const router = express.Router();
const Message = require("../models/message.model");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

// Get messages for a project
router.get("/:projectId", async (req, res) => {
  try {
    const messages = await Message.find({ project: req.params.projectId })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post a message
router.post("/:projectId", async (req, res) => {
  try {
    const message = await Message.create({
      project: req.params.projectId,
      sender: req.user._id,
      senderName: req.user.name,
      text: req.body.text,
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;