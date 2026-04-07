/**
 * Idempotent-ish demo data for sales / QA. Removes prior seed rows by keys, then inserts:
 * - demo@hestia.app (agency) / client@hestia.app (client) — password Demo123!
 * - One shared project, one invoice to the client email, one welcome message.
 *
 * Usage (from repo):  cd server && node scripts/seed-demo.js
 * Requires MONGO_URI and JWT_SECRET in .env (JWT not used here but keeps env consistent).
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
require("../config/mongoDns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Project = require("../models/project.model");
const Invoice = require("../models/invoice.model");
const Message = require("../models/message.model");

const DEMO_PASSWORD = "Demo123!";

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set. Add it to server/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const pass = await bcrypt.hash(DEMO_PASSWORD, 10);

  await Invoice.deleteMany({ invoiceNumber: "INV-DEMO-SEED-001" });
  const oldProjects = await Project.find({
    name: "Demo collaboration project",
  }).select("_id");
  const oldIds = oldProjects.map((p) => p._id);
  if (oldIds.length) {
    await Message.deleteMany({ project: { $in: oldIds } });
  }
  await Project.deleteMany({ name: "Demo collaboration project" });
  await User.deleteMany({
    email: { $in: ["demo@hestia.app", "client@hestia.app"] },
  });

  const agency = await User.create({
    name: "Demo Freelancer",
    email: "demo@hestia.app",
    password: pass,
    role: "agency",
  });
  const client = await User.create({
    name: "Demo Client Co.",
    email: "client@hestia.app",
    password: pass,
    role: "client",
  });

  const project = await Project.create({
    name: "Demo collaboration project",
    description:
      "Log in as freelancer or client to try messages, files, and invoices.",
    owner: agency._id,
    clients: [client._id],
    status: "Active",
    progress: 40,
  });

  await Invoice.create({
    invoiceNumber: "INV-DEMO-SEED-001",
    clientName: "Demo Client Co.",
    clientEmail: "client@hestia.app",
    items: [
      {
        description: "Phase 1 — Design",
        quantity: 1,
        rate: 5000,
        amount: 5000,
      },
    ],
    subtotal: 5000,
    tax: 0,
    total: 5000,
    status: "Sent",
    owner: agency._id,
  });

  await Message.create({
    project: project._id,
    sender: agency._id,
    senderName: agency.name,
    text: "Welcome to the shared project thread!",
  });

  console.log("Demo seed complete.");
  console.log("  Freelancer: demo@hestia.app /", DEMO_PASSWORD);
  console.log("  Client:     client@hestia.app /", DEMO_PASSWORD);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
