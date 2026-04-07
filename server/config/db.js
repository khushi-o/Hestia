const dns = require("dns");

/** Before mongoose/mongodb load: Windows ISP DNS often breaks Node SRV for mongodb+srv (querySrv ECONNREFUSED). */
(function applyMongoDnsFix() {
  try {
    dns.setDefaultResultOrder?.("ipv4first");
    const raw = process.env.DNS_SERVERS;
    const custom = raw
      ? raw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (custom.length) dns.setServers(custom);
    else if (process.platform === "win32") dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    /* ignore */
  }
})();

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
