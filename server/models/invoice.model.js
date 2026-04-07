const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, default: 1 },
  rate:        { type: Number, required: true },
  amount:      { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    clientName:    { type: String, required: true },
    clientEmail:   { type: String, required: true },
    items:         [invoiceItemSchema],
    subtotal:      { type: Number, required: true },
    tax:           { type: Number, default: 0 },
    total:         { type: Number, required: true },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Overdue"],
      default: "Draft",
    },
    dueDate: { type: Date },
    notes:   { type: String },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);