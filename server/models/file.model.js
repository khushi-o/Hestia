const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    filename:     { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype:     { type: String, required: true },
    size:         { type: Number, required: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedByName: { type: String, required: true },
  },
  { timestamps: true }
);

fileSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model("File", fileSchema);