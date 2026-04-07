const Client = require("../models/client.model");
const Project = require("../models/project.model");
const Invoice = require("../models/invoice.model");

const PROJECT_STATUSES = ["Active", "Review", "Completed", "On Hold"];
const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue"];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSystemPrompt(isClient) {
  return [
    "You convert a user's natural-language search into a strict JSON plan for a small business CRM.",
    `The user is a ${isClient ? "client portal user (only sees projects they are invited to and invoices sent to their email)" : "freelancer/agency (owns projects, CRM contacts, and invoices)"}.`,
    "Return ONLY valid JSON with this shape:",
    `{
  "summary": "one short phrase describing what you understood",
  "projects": { "include": boolean, "status": null or one of ${JSON.stringify(PROJECT_STATUSES)}, "text": null or short keywords to find in project name or description },
  "invoices": { "include": boolean, "status": null or one of ${JSON.stringify(INVOICE_STATUSES)}, "text": null or short keywords for invoice number or client name on the invoice },
  "clients": { "include": boolean, "text": null or keywords for contact name, email, or company }
}`,
    isClient
      ? 'Always set "clients.include" to false. Prefer including projects and invoices when the question is vague.'
      : 'Include "clients" when the user clearly asks about people, contacts, leads, or companies.',
    "If the query is very vague (e.g. show everything), set include true for projects and invoices with null status and null text.",
    "Use null for any field you are not inferring. Do not invent private data.",
  ].join("\n");
}

async function callOpenAiForPlan(userQuery, isClient) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_NL_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(isClient) },
        {
          role: "user",
          content: `Search query: ${String(userQuery).slice(0, 500)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 350,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizePlan(raw, isClient) {
  if (!raw || typeof raw !== "object") return null;

  const plan = {
    summary:
      typeof raw.summary === "string" ? raw.summary.slice(0, 220) : "",
    projects: {
      include: raw.projects?.include !== false,
      status: null,
      text: null,
    },
    invoices: {
      include: raw.invoices?.include !== false,
      status: null,
      text: null,
    },
    clients: {
      include: !isClient && raw.clients?.include === true,
      text: null,
    },
  };

  if (raw.projects?.status && PROJECT_STATUSES.includes(raw.projects.status)) {
    plan.projects.status = raw.projects.status;
  }
  if (
    raw.invoices?.status &&
    INVOICE_STATUSES.includes(raw.invoices.status)
  ) {
    plan.invoices.status = raw.invoices.status;
  }
  if (typeof raw.projects?.text === "string" && raw.projects.text.trim()) {
    plan.projects.text = raw.projects.text.trim().slice(0, 80);
  }
  if (typeof raw.invoices?.text === "string" && raw.invoices.text.trim()) {
    plan.invoices.text = raw.invoices.text.trim().slice(0, 80);
  }
  if (typeof raw.clients?.text === "string" && raw.clients.text.trim()) {
    plan.clients.text = raw.clients.text.trim().slice(0, 80);
  }

  if (
    !plan.projects.include &&
    !plan.invoices.include &&
    !plan.clients.include
  ) {
    plan.projects.include = true;
    plan.invoices.include = true;
  }

  return plan;
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

function mapClientRow(c) {
  return {
    id: c._id,
    title: c.name,
    subtitle: c.company || c.email || "",
    path: `/clients?clientId=${c._id}`,
  };
}

async function executePlan(plan, user) {
  const isClient = user.role === "client";
  const uid = user._id;
  const emailRe = new RegExp(
    `^${escapeRegex(String(user.email).toLowerCase())}$`,
    "i"
  );

  const out = { clients: [], projects: [], invoices: [] };

  if (plan.projects.include) {
    const parts = isClient
      ? [{ clients: uid }]
      : [{ owner: uid }];
    if (plan.projects.status) {
      parts.push({ status: plan.projects.status });
    }
    if (plan.projects.text) {
      const rx = new RegExp(escapeRegex(plan.projects.text), "i");
      parts.push({ $or: [{ name: rx }, { description: rx }] });
    }
    const projects = await Project.find(
      parts.length === 1 ? parts[0] : { $and: parts }
    )
      .limit(8)
      .select("name status progress")
      .lean();
    out.projects = projects.map(mapProjectRow);
  }

  if (plan.invoices.include) {
    const parts = isClient
      ? [{ clientEmail: emailRe }]
      : [{ owner: uid }];
    if (plan.invoices.status) {
      parts.push({ status: plan.invoices.status });
    }
    if (plan.invoices.text) {
      const rx = new RegExp(escapeRegex(plan.invoices.text), "i");
      parts.push({
        $or: [{ invoiceNumber: rx }, { clientName: rx }],
      });
    }
    const invoices = await Invoice.find(
      parts.length === 1 ? parts[0] : { $and: parts }
    )
      .limit(8)
      .select("invoiceNumber clientName status total")
      .lean();
    out.invoices = invoices.map(mapInvoiceRow);
  }

  if (!isClient && plan.clients.include) {
    const parts = [{ owner: uid }];
    if (plan.clients.text) {
      const rx = new RegExp(escapeRegex(plan.clients.text), "i");
      parts.push({
        $or: [{ name: rx }, { email: rx }, { company: rx }],
      });
    }
    const clients = await Client.find(
      parts.length === 1 ? parts[0] : { $and: parts }
    )
      .limit(8)
      .select("name email company")
      .lean();
    out.clients = clients.map(mapClientRow);
  }

  return out;
}

/**
 * @returns {Promise<{ clients: any[], projects: any[], invoices: any[], summary: string } | null>}
 */
async function runNlSearch(userQuery, user) {
  const raw = await callOpenAiForPlan(userQuery, user.role === "client");
  if (!raw) return null;
  const plan = sanitizePlan(raw, user.role === "client");
  if (!plan) return null;
  const rows = await executePlan(plan, user);
  return {
    ...rows,
    summary: plan.summary || "",
  };
}

module.exports = { runNlSearch };
