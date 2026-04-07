import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import generateInvoicePDF from "../utils/generatePDF";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { SingleDatePicker } from "../components/SingleDatePicker.jsx";
import { pushRecent } from "../utils/recentItems";

const today = new Date().toISOString().split("T")[0];

const Invoices = () => {
  const accent = useAuthStore((s) => s.accent);
  const mode   = useAuthStore((s) => s.mode);
  const user   = useAuthStore((s) => s.user);
  const isAgency = user?.role !== "client";
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", dueDate: today,
    tax: 0, notes: "",
    items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
  });

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchInvoices(); }, []);

  useEffect(() => {
    const id = searchParams.get("invoiceId");
    if (!id || !invoices.length) return;
    const inv = invoices.find((x) => x._id === id);
    if (inv) setSelectedInvoice(inv);
  }, [searchParams, invoices]);

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/invoices");
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    if (field === "quantity" || field === "rate") {
      items[index].amount = items[index].quantity * items[index].rate;
    }
    setForm({ ...form, items });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: "", quantity: 1, rate: 0, amount: 0 }] });
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const subtotal  = form.items.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = (subtotal * form.tax) / 100;
  const total     = subtotal + taxAmount;

  const handleCreate = async () => {
    if (!form.clientName || !form.clientEmail)
      return alert("Client name and email are required");
    try {
      const res = await API.post("/invoices", form);
      setInvoices([res.data, ...invoices]);
      setShowModal(false);
      setForm({ clientName: "", clientEmail: "", dueDate: today, tax: 0, notes: "", items: [{ description: "", quantity: 1, rate: 0, amount: 0 }] });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create invoice");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await API.put(`/invoices/${id}`, { status });
      setInvoices(invoices.map((inv) => inv._id === id ? res.data : inv));
      setSelectedInvoice(res.data);
    } catch {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await API.delete(`/invoices/${id}`);
      setInvoices(invoices.filter((inv) => inv._id !== id));
      setSelectedInvoice(null);
    } catch {
      alert("Failed to delete invoice");
    }
  };

  const statusColor = (status) => ({
    Draft:   { background: "rgba(148,163,184,0.12)", color: "#94a3b8" },
    Sent:    { background: "rgba(56,189,248,0.12)",  color: "#38bdf8" },
    Paid:    { background: "rgba(52,211,153,0.12)",  color: "#34d399" },
    Overdue: { background: "rgba(248,113,113,0.12)", color: "#f87171" },
  }[status] || {});

  const base = {
    borderRadius: 6, border: `1px solid ${m.cardBorder}`,
    background: m.bg, color: m.text, fontSize: 12,
    outline: "none", padding: "8px 10px", boxSizing: "border-box", minWidth: 0,
  };

  const s = {
    addBtn: {
      padding: "8px 18px", borderRadius: 8, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer", boxShadow: `0 0 14px ${a.color}60`,
      transition: "all 0.2s",
    },
    content: { padding: "24px 28px", flex: 1, display: "flex", gap: 20, minWidth: 0 },
    list: { flex: 1, minWidth: 0, overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 500 },
    th: { textAlign: "left", fontSize: 10, color: m.textMuted, letterSpacing: "0.8px", textTransform: "uppercase", padding: "10px 14px", borderBottom: `1px solid ${m.cardBorder}` },
    td: { padding: "14px", borderBottom: `1px solid ${m.cardBorder}`, fontSize: 13, color: m.text, cursor: "pointer" },
    detail: { width: 300, background: m.card, borderRadius: 14, border: `1px solid ${m.cardBorder}`, padding: 20, boxShadow: m.shadow, flexShrink: 0, height: "fit-content" },
    detailTitle: { fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: m.text, marginBottom: 4 },
    detailSub: { fontSize: 12, color: m.textMuted, marginBottom: 16, wordBreak: "break-all" },
    divider: { height: 1, background: m.cardBorder, margin: "12px 0" },
    detailRow: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8, gap: 8 },
    detailLabel: { color: m.textMuted },
    detailValue: { color: m.text, fontWeight: 500 },
    totalRow: { display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: m.text, marginTop: 8 },
    actionBtns: { display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" },
    actionBtn: (color) => ({ padding: "6px 12px", borderRadius: 6, border: "none", background: color + "20", color: color, fontSize: 11, fontWeight: 600, cursor: "pointer" }),
    downloadBtn: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: a.color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 12px ${a.color}60`, marginTop: 8, marginBottom: 4 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, overflowY: "auto", padding: 20 },
    modal: { background: m.card, borderRadius: 16, border: `1px solid ${m.cardBorder}`, padding: 28, width: "90%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", margin: "auto", boxSizing: "border-box" },
    modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: m.text, marginBottom: 20 },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${m.cardBorder}`, background: m.bg, color: m.text, fontSize: 13, marginBottom: 10, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", minWidth: 0, colorScheme: mode === "light" ? "light" : "dark" },
    itemRow: { display: "grid", gridTemplateColumns: "1fr 60px 80px 60px 24px", gap: 6, marginBottom: 8, alignItems: "center" },
    itemDesc: { ...base },
    itemSmall: { ...base, width: "100%" },
    itemAmount: { fontSize: 12, color: a.color, fontWeight: 600, textAlign: "right" },
    addItemBtn: { padding: "6px 12px", borderRadius: 6, border: `1px dashed ${a.color}`, background: "transparent", color: a.color, fontSize: 12, cursor: "pointer", marginBottom: 12 },
    summaryBox: { background: m.bg, borderRadius: 8, padding: 12, marginBottom: 12, border: `1px solid ${m.cardBorder}` },
    modalBtns: { display: "flex", gap: 10 },
    cancelBtn: { flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${m.cardBorder}`, background: "transparent", color: m.textMuted, fontSize: 13, cursor: "pointer" },
    saveBtn: { flex: 1, padding: "10px", borderRadius: 8, border: "none", background: a.color, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  };

  return (
    <Layout>
      <PageHeader title={isAgency ? "Invoices" : "My invoices"}>
        {isAgency ? (
          <button
            style={s.addBtn}
            onClick={() => setShowModal(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            + New Invoice
          </button>
        ) : null}
      </PageHeader>

      <div style={s.content}>
        <div style={s.list}>
          {loading ? (
            <EmptyState icon="⏳" title="Loading invoices..." subtitle="" />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No invoices yet"
              subtitle={
                isAgency
                  ? "Create your first invoice to get started"
                  : "Invoices your freelancer sends to your email will appear here."
              }
              action={isAgency ? "+ New Invoice" : undefined}
              onAction={isAgency ? () => setShowModal(true) : undefined}
            />
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Invoice</th>
                  <th style={s.th}>Client</th>
                  <th style={s.th}>Amount</th>
                  <th style={s.th}>Due Date</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setSearchParams({ invoiceId: inv._id });
                      pushRecent(user?._id, {
                        type: "invoice",
                        id: inv._id,
                        title: inv.invoiceNumber,
                        subtitle: inv.clientName,
                        path: `/invoices?invoiceId=${inv._id}`,
                      });
                    }}
                    style={{ background: selectedInvoice?._id === inv._id ? a.glow : "transparent", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (selectedInvoice?._id !== inv._id) e.currentTarget.style.background = m.cardBorder; }}
                    onMouseLeave={(e) => { if (selectedInvoice?._id !== inv._id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={s.td}>{inv.invoiceNumber}</td>
                    <td style={s.td}>{inv.clientName}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: a.color }}>₹{inv.total.toLocaleString()}</td>
                    <td style={s.td}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, ...statusColor(inv.status) }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedInvoice && (
          <div style={s.detail}>
            <div style={s.detailTitle}>{selectedInvoice.invoiceNumber}</div>
            <div style={s.detailSub}>To: {selectedInvoice.clientName} · {selectedInvoice.clientEmail}</div>
            <div style={s.divider}></div>
            {selectedInvoice.items.map((item, i) => (
              <div key={i} style={s.detailRow}>
                <span style={s.detailLabel}>{item.description}</span>
                <span style={s.detailValue}>₹{item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div style={s.divider}></div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Subtotal</span>
              <span style={s.detailValue}>₹{selectedInvoice.subtotal.toLocaleString()}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Tax ({selectedInvoice.tax}%)</span>
              <span style={s.detailValue}>₹{((selectedInvoice.subtotal * selectedInvoice.tax) / 100).toLocaleString()}</span>
            </div>
            <div style={s.totalRow}>
              <span>Total</span>
              <span style={{ color: a.color }}>₹{selectedInvoice.total.toLocaleString()}</span>
            </div>
            {selectedInvoice.notes && (
              <>
                <div style={s.divider}></div>
                <div style={{ fontSize: 12, color: m.textMuted }}>{selectedInvoice.notes}</div>
              </>
            )}
            <div style={s.divider}></div>
            <button style={s.downloadBtn} onClick={() => generateInvoicePDF(selectedInvoice)}>
              ⬇️ Download PDF
            </button>
            {isAgency ? (
              <div style={s.actionBtns}>
                {["Draft", "Sent", "Paid", "Overdue"].map((status) => (
                  <button
                    key={status}
                    style={s.actionBtn(
                      status === "Paid" ? "#34d399" :
                        status === "Sent" ? "#38bdf8" :
                          status === "Overdue" ? "#f87171" : "#94a3b8"
                    )}
                    onClick={() => handleStatusChange(selectedInvoice._id, status)}
                  >
                    {status}
                  </button>
                ))}
                <button style={s.actionBtn("#f87171")} onClick={() => handleDelete(selectedInvoice._id)}>🗑 Delete</button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isAgency && showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>New Invoice</div>
            <div style={s.row2}>
              <input style={s.input} placeholder="Client name *" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              <input style={s.input} placeholder="Client email *" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
            </div>
            <div style={s.row2}>
              <SingleDatePicker
                value={form.dueDate}
                onChange={(dueDate) => setForm({ ...form, dueDate })}
                accent={a}
                surface={m}
                label="Due date"
                zIndex={200}
              />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 600,
                    color: m.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Tax %
                </span>
                <input
                  style={{ ...s.input, marginBottom: 0 }}
                  type="number"
                  placeholder="0"
                  value={form.tax}
                  onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })}
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: m.textMuted, marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Line Items</div>
            {form.items.map((item, i) => (
              <div key={i} style={s.itemRow}>
                <input style={s.itemDesc} placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                <input style={s.itemSmall} type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                <input style={s.itemSmall} type="number" placeholder="Rate ₹" value={item.rate} onChange={(e) => updateItem(i, "rate", Number(e.target.value))} />
                <div style={s.itemAmount}>₹{item.amount.toLocaleString()}</div>
                <button style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => removeItem(i)}>×</button>
              </div>
            ))}
            <button style={s.addItemBtn} onClick={addItem}>+ Add Item</button>
            <div style={s.summaryBox}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: m.textMuted, marginBottom: 4 }}>
                <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: m.textMuted, marginBottom: 4 }}>
                <span>Tax ({form.tax}%)</span><span>₹{taxAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: a.color }}>
                <span>Total</span><span>₹{total.toLocaleString()}</span>
              </div>
            </div>
            <textarea style={{ ...s.input, height: 60, resize: "none" }} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleCreate}>Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices;