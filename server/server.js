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

  const corsOrigins = getCorsOrigins();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: corsOrigins, methods: ["GET", "POST"] },
  });

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
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  io.on("connection", (socket) => {
    socket.on("join_project", (projectId) => {
      socket.join(projectId);
    });

    socket.on("send_message", (data) => {
      io.to(data.projectId).emit("receive_message", data);
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
