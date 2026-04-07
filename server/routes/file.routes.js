const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const File = require("../models/file.model");
const Project = require("../models/project.model");
const { protect } = require("../middleware/auth.middleware");
const {
  requireProjectAccess,
  isValidObjectId,
} = require("../middleware/projectAccess.middleware");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(protect);

/** Owner or invited portal client can read the file's project. */
async function requireFileProjectAccess(req, res, next) {
  try {
    const fileId = req.params.fileId;
    if (!isValidObjectId(fileId)) {
      return res.status(400).json({ message: "Invalid file" });
    }
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    const project = await Project.findOne({
      _id: file.project,
      $or: [{ owner: req.user._id }, { clients: req.user._id }],
    });
    if (!project) {
      return res.status(404).json({ message: "File not found" });
    }
    req.fileRecord = file;
    next();
  } catch (err) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message;
    res.status(500).json({ message: msg });
  }
}

/** Only project owner may delete files. */
async function requireFileProjectOwnerDelete(req, res, next) {
  try {
    const fileId = req.params.fileId;
    if (!isValidObjectId(fileId)) {
      return res.status(400).json({ message: "Invalid file" });
    }
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    const project = await Project.findOne({
      _id: file.project,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(403).json({ message: "Only the project owner can remove files" });
    }
    req.fileRecord = file;
    next();
  } catch (err) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message;
    res.status(500).json({ message: msg });
  }
}

router.get("/download/:fileId", requireFileProjectAccess, async (req, res) => {
  try {
    const file = req.fileRecord;
    const filePath = path.join(uploadDir, file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.download(filePath, file.originalName);
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message;
    res.status(500).json({ message: msg });
  }
});

router.delete("/:fileId", requireFileProjectOwnerDelete, async (req, res) => {
  try {
    const file = req.fileRecord;
    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await File.findByIdAndDelete(req.params.fileId);
    res.json({ message: "File deleted" });
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message;
    res.status(500).json({ message: msg });
  }
});

router.get("/:projectId", requireProjectAccess, async (req, res) => {
  try {
    const files = await File.find({ project: req.params.projectId })
      .sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message;
    res.status(500).json({ message: msg });
  }
});

router.post(
  "/:projectId",
  requireProjectAccess,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const file = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        project: req.params.projectId,
        uploadedBy: req.user._id,
        uploadedByName: req.user.name,
      });
      res.status(201).json(file);
    } catch (error) {
      const msg =
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error.message;
      res.status(500).json({ message: msg });
    }
  }
);

module.exports = router;
