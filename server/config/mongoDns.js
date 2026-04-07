const dns = require("dns");

/**
 * Run before any `mongoose.connect` / mongodb+srv use.
 * Windows + some ISP DNS return querySrv ECONNREFUSED for Atlas SRV lookups.
 * Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env to override; on win32 we default to those if unset.
 */
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
