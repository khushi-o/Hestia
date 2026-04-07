require("dotenv").config();

/**
 * Must await Mongo before requiring express: connectDB() is async; if express loads
 * while mongoose is still resolving mongodb+srv, some Windows setups get querySrv ECONNREFUSED.
 */
async function start() {
  const connectDB = require("./config/db.js");
  await connectDB();

  const express = require("express");
  const cors = require("cors");
  const http = require("http");
  const { Server } = require("socket.io");
  const { getCorsOrigins } = require("./config/cors.config.js");
  const path = require("path");
  const mongoose = require("mongoose");
  const Project = require("./models/project.model");
  const { socketAuthMiddleware } = require("./middleware/socketAuth.middleware.js");

  const corsOrigins = getCorsOrigins();

  const app = express();
  // Required for express-rate-limit behind Railway / Vercel-style reverse proxies
  app.set("trust proxy", 1);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: corsOrigins, methods: ["GET", "POST"] },
  });

  io.use(socketAuthMiddleware);
  app.set("io", io);

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api/projects", require("./routes/project.routes"));
  app.use("/api/invoices", require("./routes/invoice.routes"));
  app.use("/api/clients", require("./routes/client.routes"));
  app.use("/api/messages", require("./routes/message.routes"));
  app.use("/api/files", require("./routes/file.routes"));
  app.use("/api/notifications", require("./routes/notification.routes"));
  app.use("/api/search", require("./routes/search.routes"));
  // Uploads are served only via GET /api/files/download/:fileId (auth + owner check), not public static.

  async function userOwnsProject(userId, projectId) {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return false;
    }
    const p = await Project.findOne({ _id: projectId, owner: userId });
    return !!p;
  }

  io.on("connection", (socket) => {
    socket.on("join_project", async (projectId, cb) => {
      const ok = await userOwnsProject(socket.user._id, projectId);
      if (ok) {
        const next = String(projectId);
        const prev = socket.data?.activeProjectId;
        if (prev && prev !== next) {
          socket.leave(prev);
        }
        socket.join(next);
        socket.data.activeProjectId = next;
      }
      if (typeof cb === "function") cb({ ok });
    });

    socket.on("disconnect", () => {});
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
