const mongoose = require("mongoose");
const Project = require("../models/project.model");

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Ensures req.params.projectId exists and is owned by req.user.
 * Sets req.project for downstream handlers.
 */
async function requireProjectOwner(req, res, next) {
  try {
    const projectId = req.params.projectId;
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project" });
    }
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    req.project = project;
    next();
  } catch (err) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message;
    res.status(500).json({ message: msg });
  }
}

/**
 * Project owner OR invited portal client (in project.clients).
 */
async function requireProjectAccess(req, res, next) {
  try {
    const projectId = req.params.projectId;
    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project" });
    }
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.user._id }, { clients: req.user._id }],
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    req.project = project;
    next();
  } catch (err) {
    const msg =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message;
    res.status(500).json({ message: msg });
  }
}

module.exports = {
  requireProjectOwner,
  requireProjectAccess,
  isValidObjectId,
};
