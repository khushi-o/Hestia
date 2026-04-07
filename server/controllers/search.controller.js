const Client = require("../models/client.model");
const Project = require("../models/project.model");
const Invoice = require("../models/invoice.model");
const { runNlSearch } = require("../services/nlSearch.service");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapClientRow(c) {
  return {
    id: c._id,
    title: c.name,
    subtitle: c.company || c.email || "",
    path: `/clients?clientId=${c._id}`,
  };
}

function mapProjectRow(p) {
  return {
    id: p._id,
    title: p.name,
    subtitle: p.status,
    path: `/projects?projectId=${p._id}`,
  };
}

function mapInvoiceRow(inv) {
  return {
    id: inv._id,
    title: inv.invoiceNumber,
    subtitle: `${inv.clientName} · ${inv.status}`,
    path: `/invoices?invoiceId=${inv._id}`,
  };
}

async function keywordSearch(user, q) {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  if (user.role === "client") {
    const emailRe = new RegExp(
      `^${escapeRegex(user.email.toLowerCase())}$`,
      "i"
    );
    const [projects, invoices] = await Promise.all([
      Project.find({
        clients: user._id,
        name: regex,
      })
        .limit(8)
        .select("name status progress")
        .lean(),
      Invoice.find({
        clientEmail: emailRe,
        $or: [{ invoiceNumber: regex }, { clientName: regex }],
      })
        .limit(8)
        .select("invoiceNumber clientName status total")
        .lean(),
    ]);
    return {
      clients: [],
      projects: projects.map(mapProjectRow),
      invoices: invoices.map(mapInvoiceRow),
    };
  }

  const owner = user._id;

  const [clients, projects, invoices] = await Promise.all([
    Client.find({
      owner,
      $or: [{ name: regex }, { email: regex }, { company: regex }],
    })
      .limit(8)
      .select("name email company")
      .lean(),
    Project.find({ owner, name: regex })
      .limit(8)
      .select("name status progress")
      .lean(),
    Invoice.find({
      owner,
      $or: [{ invoiceNumber: regex }, { clientName: regex }],
    })
      .limit(8)
      .select("invoiceNumber clientName status total")
      .lean(),
  ]);

  return {
    clients: clients.map(mapClientRow),
    projects: projects.map(mapProjectRow),
    invoices: invoices.map(mapInvoiceRow),
  };
}

exports.search = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.json({ clients: [], projects: [], invoices: [] });
    }

    const wantNl =
      req.query.nl === "1" &&
      Boolean(process.env.OPENAI_API_KEY) &&
      q.length >= 4;

    if (wantNl) {
      try {
        const nl = await runNlSearch(q, req.user);
        if (nl) {
          return res.json({
            clients: nl.clients,
            projects: nl.projects,
            invoices: nl.invoices,
            nl: true,
            nlSummary: nl.summary || "",
          });
        }
      } catch {
        /* fall back to keyword search */
      }
    }

    const payload = await keywordSearch(req.user, q);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
