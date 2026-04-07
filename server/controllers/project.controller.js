const Project = require("../models/project.model");
const User = require("../models/user.model");

function isAgency(user) {
  return !user || user.role !== "client";
}

// @desc  Get all projects for logged in user (owned or invited as portal client)
// @route GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    let query;
    if (req.user.role === "client") {
      query = { clients: req.user._id };
    } else {
      query = { owner: req.user._id };
    }
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a project
// @route POST /api/projects
exports.createProject = async (req, res) => {
  try {
    if (!isAgency(req.user)) {
      return res.status(403).json({ message: "Clients cannot create projects" });
    }
    const { name, description, status, dueDate, clientEmails } = req.body;
    const doc = {
      name,
      description,
      status,
      dueDate,
      owner: req.user._id,
    };
    if (Array.isArray(clientEmails) && clientEmails.length) {
      const normalized = [
        ...new Set(
          clientEmails
            .map((e) => String(e).trim().toLowerCase())
            .filter(Boolean)
        ),
      ];
      const users = await User.find({
        email: { $in: normalized },
        role: "client",
      }).select("_id");
      doc.clients = users.map((u) => u._id);
    }
    const project = await Project.create(doc);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a project
// @route PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    if (!isAgency(req.user)) {
      return res.status(403).json({ message: "Clients cannot edit projects" });
    }
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const allowed = ["name", "description", "status", "dueDate", "progress"];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    if (Array.isArray(req.body.clientEmails)) {
      const normalized = [
        ...new Set(
          req.body.clientEmails
            .map((e) => String(e).trim().toLowerCase())
            .filter(Boolean)
        ),
      ];
      const users = await User.find({
        email: { $in: normalized },
        role: "client",
      }).select("_id");
      update.clients = users.map((u) => u._id);
    }

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a project
// @route DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    if (!isAgency(req.user)) {
      return res.status(403).json({ message: "Clients cannot delete projects" });
    }
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
