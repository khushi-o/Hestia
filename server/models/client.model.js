const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true },
    phone:   { type: String, trim: true },
    company: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Lead"],
      default: "Active",
    },
    notes:  { type: String },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

clientSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Client", clientSchema);