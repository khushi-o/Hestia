import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { SingleDatePicker } from "../components/SingleDatePicker.jsx";
import { pushRecent } from "../utils/recentItems";

const today = new Date().toISOString().split("T")[0];

const Projects = () => {
  const accent = useAuthStore((s) => s.accent);
  const mode   = useAuthStore((s) => s.mode);
  const user   = useAuthStore((s) => s.user);
  const isAgency = user?.role !== "client";
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [editForm, setEditForm]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "Active",
    dueDate: today,
    clientEmailsStr: "",
  });

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchProjects(); }, []);

  const highlightId = searchParams.get("projectId");

  useEffect(() => {
    const id = searchParams.get("projectId");
    if (!id || !projects.length) return;
    requestAnimationFrame(() => {
      document.getElementById(`project-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [searchParams, projects]);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) return alert("Project name is required");
    try {
      const clientEmails = form.clientEmailsStr
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const payload = { ...form };
      delete payload.clientEmailsStr;
      if (clientEmails.length) payload.clientEmails = clientEmails;
      const res = await API.post("/projects", payload);
      setProjects([res.data, ...projects]);
      setShowModal(false);
      setForm({
        name: "",
        description: "",
        status: "Active",
        dueDate: today,
        clientEmailsStr: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create project");
    }
  };

  const openEdit = (p) => {
    setEditForm({
      _id: p._id,
      name: p.name,
      description: p.description || "",
      status: p.status,
      dueDate: p.dueDate ? String(p.dueDate).slice(0, 10) : today,
      clientEmailsStr: "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.name) return alert("Project name is required");
    try {
      const clientEmails = editForm.clientEmailsStr
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const res = await API.put(`/projects/${editForm._id}`, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        dueDate: editForm.dueDate,
        clientEmails,
      });
      setProjects(projects.map((x) => (x._id === res.data._id ? res.data : x)));
      setEditOpen(false);
      setEditForm(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update project");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await API.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch {
      alert("Failed to delete project");
    }
  };

  const statusColor = (status) => ({
    Active:    { background: "rgba(52,211,153,0.12)",  color: "#34d399" },
    Review:    { background: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
    Completed: { background: "rgba(129,140,248,0.12)", color: "#818cf8" },
    "On Hold": { background: "rgba(248,113,113,0.12)", color: "#f87171" },
  }[status] || {});

  const s = {
    addBtn: {
      padding: "8px 18px", borderRadius: 8, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer",
      boxShadow: `0 0 14px ${a.color}60`, transition: "all 0.2s",
    },
    content: { padding: "24px 28px", flex: 1 },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16,
    },
    card: {
      background: m.card, borderRadius: 14,
      border: `1px solid ${m.cardBorder}`,
      padding: 20, boxShadow: m.shadow,
      position: "relative", overflow: "hidden",
      transition: "all 0.2s ease", cursor: "default",
    },
    cardAccent: {
      position: "absolute", top: 0, left: 0, right: 0, height: 2,
      background: a.color, opacity: 0.6,
    },
    cardHeader: {
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", marginBottom: 8,
    },
    cardName: {
      fontFamily: "'Syne', sans-serif", fontSize: 15,
      fontWeight: 600, color: m.text,
    },
    cardDesc: {
      fontSize: 12, color: m.textMuted,
      marginBottom: 14, lineHeight: 1.5,
    },
    cardFooter: {
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginTop: 14,
    },
    dueDate: { fontSize: 11, color: m.textMuted },
    deleteBtn: {
      fontSize: 11, color: "#f87171", cursor: "pointer",
      background: "none", border: "none", padding: "2px 6px",
      transition: "all 0.2s",
    },
    barBg: {
      height: 3, background: m.cardBorder,
      borderRadius: 2, overflow: "hidden", marginBottom: 6,
    },
    barFill: (pct) => ({
      height: "100%", borderRadius: 2, width: `${pct}%`,
      background: `linear-gradient(90deg, ${a.color}, ${a.color}99)`,
      boxShadow: `0 0 6px ${a.color}60`, transition: "width 0.8s ease",
    }),
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    },
    modal: {
      background: m.card, borderRadius: 16,
      border: `1px solid ${m.cardBorder}`, padding: 28,
      width: "90%", maxWidth: 440,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)", boxSizing: "border-box",
    },
    modalTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 18,
      fontWeight: 700, color: m.text, marginBottom: 20,
    },
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 8,
      border: `1px solid ${m.cardBorder}`, background: m.bg,
      color: m.text, fontSize: 13, marginBottom: 10, outline: "none",
      fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
      minWidth: 0, colorScheme: mode === "light" ? "light" : "dark",
    },
    select: {
      width: "100%", padding: "10px 14px", borderRadius: 8,
      border: `1px solid ${m.cardBorder}`, background: m.bg,
      color: m.text, fontSize: 13, marginBottom: 10, outline: "none",
      fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", minWidth: 0,
    },
    modalBtns: { display: "flex", gap: 10, marginTop: 8 },
    cancelBtn: {
      flex: 1, padding: "10px", borderRadius: 8,
      border: `1px solid ${m.cardBorder}`, background: "transparent",
      color: m.textMuted, fontSize: 13, cursor: "pointer",
    },
    saveBtn: {
      flex: 1, padding: "10px", borderRadius: 8, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer",
      boxShadow: `0 0 14px ${a.color}60`,
    },
  };

  return (
    <Layout>
      <PageHeader title={isAgency ? "Projects" : "My projects"}>
        {isAgency ? (
          <button
            style={s.addBtn}
            onClick={() => setShowModal(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            + New Project
          </button>
        ) : null}
      </PageHeader>

      <div style={s.content}>
        {loading ? (
          <EmptyState icon="⏳" title="Loading projects..." subtitle="" />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="No projects yet"
            subtitle={
              isAgency
                ? "Create your first project and start managing your work"
                : "Ask your freelancer to add your email to a project (they need a client account registered with the same email)."
            }
            action={isAgency ? "+ New Project" : undefined}
            onAction={isAgency ? () => setShowModal(true) : undefined}
          />
        ) : (
          <div style={s.grid}>
            {projects.map((p) => (
              <div
                key={p._id}
                id={`project-${p._id}`}
                style={{
                  ...s.card,
                  borderColor:
                    highlightId === p._id ? `${a.color}80` : m.cardBorder,
                  boxShadow:
                    highlightId === p._id
                      ? `0 0 0 2px ${a.color}40`
                      : m.shadow,
                }}
                onClick={() => {
                  setSearchParams({ projectId: p._id });
                  pushRecent(user?._id, {
                    type: "project",
                    id: p._id,
                    title: p.name,
                    subtitle: p.status,
                    path: `/projects?projectId=${p._id}`,
                  });
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 12px 32px ${a.color}20`;
                  e.currentTarget.style.borderColor = `${a.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    highlightId === p._id
                      ? `0 0 0 2px ${a.color}40`
                      : m.shadow;
                  e.currentTarget.style.borderColor =
                    highlightId === p._id ? `${a.color}80` : m.cardBorder;
                }}
              >
                <div style={s.cardAccent}></div>
                <div style={s.cardHeader}>
                  <div style={s.cardName}>{p.name}</div>
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 20,
                    fontWeight: 600, ...statusColor(p.status),
                  }}>{p.status}</span>
                </div>
                <div style={s.cardDesc}>{p.description || "No description"}</div>
                <div style={s.barBg}>
                  <div style={s.barFill(p.progress)}></div>
                </div>
                <div style={{ fontSize: 10, color: m.textMuted, marginBottom: 4 }}>
                  {p.progress}% complete
                </div>
                <div style={s.cardFooter}>
                  <div style={s.dueDate}>
                    {p.dueDate ? `Due ${new Date(p.dueDate).toLocaleDateString()}` : "No due date"}
                  </div>
                  {isAgency ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={{ ...s.deleteBtn, color: a.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                      >
                        Invite clients
                      </button>
                      <button
                        style={s.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p._id);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>New Project</div>
            <input
              style={s.input} placeholder="Project name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <textarea
              style={{ ...s.input, height: 80, resize: "vertical" }}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select
              style={s.select} value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <SingleDatePicker
              value={form.dueDate}
              onChange={(dueDate) => setForm({ ...form, dueDate })}
              accent={a}
              surface={m}
              label="Due date"
              zIndex={200}
            />
            <label style={{ fontSize: 11, color: m.textMuted, display: "block", marginBottom: 4 }}>
              Portal client emails (optional, comma-separated — each must have a client account)
            </label>
            <input
              style={s.input}
              placeholder="client@example.com"
              value={form.clientEmailsStr}
              onChange={(e) => setForm({ ...form, clientEmailsStr: e.target.value })}
            />
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleCreate}>Create Project</button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editForm && (
        <div style={s.overlay} onClick={() => { setEditOpen(false); setEditForm(null); }}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>Project & client access</div>
            <input
              style={s.input} placeholder="Project name *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <textarea
              style={{ ...s.input, height: 72, resize: "vertical" }}
              placeholder="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <select
              style={s.select} value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <SingleDatePicker
              value={editForm.dueDate}
              onChange={(dueDate) => setEditForm({ ...editForm, dueDate })}
              accent={a}
              surface={m}
              label="Due date"
              zIndex={200}
            />
            <label style={{ fontSize: 11, color: m.textMuted, display: "block", marginBottom: 4 }}>
              Portal clients — login emails (comma-separated, client accounts only)
            </label>
            <input
              style={s.input}
              placeholder="client@example.com"
              value={editForm.clientEmailsStr}
              onChange={(e) => setEditForm({ ...editForm, clientEmailsStr: e.target.value })}
            />
            <div style={s.modalBtns}>
              <button type="button" style={s.cancelBtn} onClick={() => { setEditOpen(false); setEditForm(null); }}>Cancel</button>
              <button type="button" style={s.saveBtn} onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Projects;