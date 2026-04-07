const express = require("express");
const router = express.Router();
const { authWriteLimiter } = require("../middleware/rateLimit.middleware");
const { register, login } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const Project = require("../models/project.model");
const Invoice = require("../models/invoice.model");
const Client = require("../models/client.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

/** Inclusive calendar days between two normalized day-starts. */
function inclusiveCalendarDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** Same-length window immediately before `start` (for period-over-period stats). */
function previousPeriodBounds(start, end) {
  const s0 = new Date(start);
  s0.setHours(0, 0, 0, 0);
  const e0 = new Date(end);
  e0.setHours(0, 0, 0, 0);
  const n = inclusiveCalendarDays(s0, e0);
  const prevEnd = new Date(s0);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (n - 1));
  prevStart.setHours(0, 0, 0, 0);
  return { from: prevStart, to: prevEnd };
}

async function metricsForRange(owner, rangeStart, rangeEnd) {
  const [projects, clients, invoicesInRange, paidInRange, avgAgg] = await Promise.all([
    Project.countDocuments({
      owner,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    }),
    Client.countDocuments({
      owner,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    }),
    Invoice.find({
      owner,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    }),
    Invoice.find({
      owner,
      status: "Paid",
      updatedAt: { $gte: rangeStart, $lte: rangeEnd },
    }).select("total updatedAt"),
    Project.aggregate([
      {
        $match: {
          owner,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      { $group: { _id: null, avg: { $avg: "$progress" } } },
    ]),
  ]);
  const pendingInvoices = invoicesInRange.filter(
    (inv) => inv.status === "Draft" || inv.status === "Sent"
  ).length;
  const totalRevenue = paidInRange.reduce((sum, inv) => sum + inv.total, 0);
  const rawAvg = avgAgg[0]?.avg;
  const avgProjectProgress =
    rawAvg == null ? 0 : Math.round(rawAvg * 10) / 10;
  return {
    projects,
    clients,
    pendingInvoices,
    totalRevenue,
    avgProjectProgress,
    invoicesInRange,
    paidInRange,
  };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function clientMetricsForRange(userId, clientEmail, rangeStart, rangeEnd) {
  const emailRe = new RegExp(`^${escapeRegex(clientEmail.toLowerCase())}$`, "i");
  const [projects, invoicesInRange, paidInRange, avgAgg] = await Promise.all([
    Project.countDocuments({
      clients: userId,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    }),
    Invoice.find({
      clientEmail: emailRe,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    }),
    Invoice.find({
      clientEmail: emailRe,
      status: "Paid",
      updatedAt: { $gte: rangeStart, $lte: rangeEnd },
    }).select("total updatedAt"),
    Project.aggregate([
      {
        $match: {
          clients: userId,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      { $group: { _id: null, avg: { $avg: "$progress" } } },
    ]),
  ]);
  const pendingInvoices = invoicesInRange.filter(
    (inv) => inv.status === "Draft" || inv.status === "Sent"
  ).length;
  const totalRevenue = paidInRange.reduce((sum, inv) => sum + inv.total, 0);
  const rawAvg = avgAgg[0]?.avg;
  const avgProjectProgress =
    rawAvg == null ? 0 : Math.round(rawAvg * 10) / 10;
  return {
    projects,
    pendingInvoices,
    totalRevenue,
    avgProjectProgress,
    invoicesInRange,
    paidInRange,
  };
}

router.post("/register", authWriteLimiter, register);
router.post("/login", authWriteLimiter, login);

// Stats — optional `from` & `to` (ISO dates) for dashboard range filter + charts
router.get("/stats", protect, async (req, res) => {
  try {
    const owner = req.user._id;
    const { from, to } = req.query;

    if (req.user.role === "client") {
      if (!from || !to) {
        return res.status(400).json({ message: "from and to are required" });
      }
      const start = new Date(from);
      const end = new Date(to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid from/to dates" });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (start > end) {
        return res
          .status(400)
          .json({ message: "from must be before or equal to to" });
      }
      const prev = previousPeriodBounds(start, end);
      const [current, previousMetrics, recentProjects] = await Promise.all([
        clientMetricsForRange(req.user._id, req.user.email, start, end),
        clientMetricsForRange(req.user._id, req.user.email, prev.from, prev.to),
        Project.find({
          clients: req.user._id,
          createdAt: { $gte: start, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(3)
          .select("name status progress"),
      ]);

      const byDay = {};
      current.paidInRange.forEach((inv) => {
        const key = inv.updatedAt.toISOString().slice(0, 10);
        byDay[key] = (byDay[key] || 0) + inv.total;
      });
      const revenueSeries = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        revenueSeries.push({ date: key, revenue: byDay[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      const invoiceStatusMix = { Draft: 0, Sent: 0, Paid: 0, Overdue: 0 };
      current.invoicesInRange.forEach((inv) => {
        if (invoiceStatusMix[inv.status] !== undefined) {
          invoiceStatusMix[inv.status] += 1;
        }
      });

      return res.json({
        viewerRole: "client",
        projects: current.projects,
        clients: 0,
        pendingInvoices: current.pendingInvoices,
        totalRevenue: current.totalRevenue,
        avgProjectProgress: current.avgProjectProgress,
        recentProjects,
        revenueSeries,
        invoiceStatusMix,
        range: { from: start.toISOString(), to: end.toISOString() },
        previousPeriod: {
          from: prev.from.toISOString(),
          to: prev.to.toISOString(),
          projects: previousMetrics.projects,
          clients: 0,
          pendingInvoices: previousMetrics.pendingInvoices,
          totalRevenue: previousMetrics.totalRevenue,
          avgProjectProgress: previousMetrics.avgProjectProgress,
        },
      });
    }

    if (!from || !to) {
      const [projects, clients, invoices] = await Promise.all([
        Project.countDocuments({ owner }),
        Client.countDocuments({ owner }),
        Invoice.find({ owner }),
      ]);
      const pendingInvoices = invoices.filter(
        (inv) => inv.status === "Draft" || inv.status === "Sent"
      ).length;
      const totalRevenue = invoices
        .filter((inv) => inv.status === "Paid")
        .reduce((sum, inv) => sum + inv.total, 0);
      const recentProjects = await Project.find({ owner })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name status progress");
      return res.json({
        projects,
        clients,
        pendingInvoices,
        totalRevenue,
        recentProjects,
      });
    }

    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid from/to dates" });
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ message: "from must be before or equal to to" });
    }

    const prev = previousPeriodBounds(start, end);

    const [current, previousMetrics, recentProjects] = await Promise.all([
      metricsForRange(owner, start, end),
      metricsForRange(owner, prev.from, prev.to),
      Project.find({
        owner,
        createdAt: { $gte: start, $lte: end },
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name status progress"),
    ]);

    const {
      projects,
      clients,
      pendingInvoices,
      totalRevenue,
      avgProjectProgress,
      invoicesInRange,
      paidInRange,
    } = current;

    const byDay = {};
    paidInRange.forEach((inv) => {
      const key = inv.updatedAt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + inv.total;
    });
    const revenueSeries = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      revenueSeries.push({ date: key, revenue: byDay[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const invoiceStatusMix = { Draft: 0, Sent: 0, Paid: 0, Overdue: 0 };
    invoicesInRange.forEach((inv) => {
      if (invoiceStatusMix[inv.status] !== undefined) {
        invoiceStatusMix[inv.status] += 1;
      }
    });

    res.json({
      projects,
      clients,
      pendingInvoices,
      totalRevenue,
      avgProjectProgress,
      recentProjects,
      revenueSeries,
      invoiceStatusMix,
      range: { from: start.toISOString(), to: end.toISOString() },
      previousPeriod: {
        from: prev.from.toISOString(),
        to: prev.to.toISOString(),
        projects: previousMetrics.projects,
        clients: previousMetrics.clients,
        pendingInvoices: previousMetrics.pendingInvoices,
        totalRevenue: previousMetrics.totalRevenue,
        avgProjectProgress: previousMetrics.avgProjectProgress,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (email) user.email = email;
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Current password is incorrect" });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;