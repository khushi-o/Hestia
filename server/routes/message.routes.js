const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Message = require("../models/message.model");
const { protect } = require("../middleware/auth.middleware");
const { requireProjectOwner } = require("../middleware/projectAccess.middleware");
const Notification = require("../models/notification.model");
const Project = require("../models/project.model");

const MAX_MESSAGE_LEN = 5000;

router.use(protect);

router.delete(
  "/:projectId/:messageId",
  requireProjectOwner,
  async (req, res) => {
    try {
      const { projectId, messageId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      const message = await Message.findOne({
        _id: messageId,
        project: projectId,
      });
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only delete your own messages" });
      }
      await Message.deleteOne({ _id: message._id });

      const io = req.app.get("io");
      if (io) {
        io.to(String(projectId)).emit("message_deleted", {
          messageId: String(message._id),
          projectId: String(projectId),
        });
      }

      res.json({ ok: true });
    } catch (error) {
      const msg =
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error.message;
      res.status(500).json({ message: msg });
    }
  }
);

router.get("/:projectId", requireProjectOwner, async (req, res) => {
  try {
    const messages = await Message.find({ project: req.params.projectId })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message;
    res.status(500).json({ message: msg });
  }
});

router.post("/:projectId", requireProjectOwner, async (req, res) => {
  try {
    const text = (req.body.text ?? "").trim();
    if (!text) {
      return res.status(400).json({ message: "Message text is required" });
    }
    if (text.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        message: `Message must be at most ${MAX_MESSAGE_LEN} characters`,
      });
    }

    const message = await Message.create({
      project: req.params.projectId,
      sender: req.user._id,
      senderName: req.user.name,
      text,
    });

    const io = req.app.get("io");
    if (io) {
      const doc = message.toObject();
      io.to(String(req.params.projectId)).emit("receive_message", {
        ...doc,
        projectId: String(req.params.projectId),
      });
    }

    const project = await Project.findById(req.params.projectId);
    if (project && project.owner.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: project.owner,
        title: "New Message",
        message: `${req.user.name} sent a message in ${project.name}`,
        type: "message",
        link: "/messages",
      });
    }

    res.status(201).json(message);
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message;
    res.status(500).json({ message: msg });
  }
});

module.exports = router;
