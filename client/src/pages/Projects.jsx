import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const today = new Date().toISOString().split("T")[0];

const Projects = ({ accent = "violet", mode = "night" }) => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "", description: "", status: "Active", dueDate: today,
  });

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) return alert("Project name is required");
    try {
      const res = await API.post("/projects", form);
      setProjects([res.data, ...projects]);
      setShowModal(false);
      setForm({ name: "", description: "", status: "Active", dueDate: today });
    } catch (err) {
      console.error("Create error:", err);
      alert(err.response?.data?.message || "Failed to create project");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await API.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      alert("Failed to delete project");
    }
  };

  const statusColor = (status) => ({
    Active:    { background: "rgba(52,211,153,0.12)",  color: "#34d399" },
    Review:    { background: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
    Completed: { background: "rgba(129,140,248,0.12)", color: "#818cf8" },
    "On Hold": { background: "rgba(248,113,113,0.12)", color: "#f87171" },
  }[status] || { background: "rgba(52,211,153,0.12)", color: "#34d399" });

  const s = {
    app: { display: "flex", minHeight: "100vh", background: m.bg, color: m.text, fontFamily: "'DM Sans', sans-serif", transition: "all 0.3s ease" },
    sidebar: { width: 220, background: m.sidebar, display: "flex", flexDirection: "column", padding: "24px 0", borderRight: `1px solid ${m.cardBorder}`, flexShrink: 0 },
    logo: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, padding: "0 20px 32px", letterSpacing: "-0.3px" },
    navLabel: { fontSize: 9, color: m.textMuted, letterSpacing: "1.5px", textTransform: "uppercase", padding: "0 12px 6px 20px" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", margin: "1px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: active ? m.text : m.textMuted, background: active ? a.glow : "transparent", transition: "all 0.2s" }),
    navDot: (active) => ({ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: active ? a.color : m.textMuted, boxShadow: active ? `0 0 8px ${a.color}` : "none" }),
    main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
    topbar: { padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${m.cardBorder}`, background: m.topbar },
    pageTitle: { fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: m.text },
    addBtn: { padding: "8px 18px", borderRadius: 8, border: "none", background: a.color, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 14px ${a.color}60` },
    content: { padding: "24px 28px", flex: 1 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
    card: { background: m.card, borderRadius: 14, border: `1px solid ${m.cardBorder}`, padding: 20, boxShadow: m.shadow, position: "relative", overflow: "hidden" },
    cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: a.color, opacity: 0.6 },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    cardName: { fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: m.text },
    cardDesc: { fontSize: 12, color: m.textMuted, marginBottom: 14, lineHeight: 1.5 },
    cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
    dueDate: { fontSize: 11, color: m.textMuted },
    deleteBtn: { fontSize: 11, color: "#f87171", cursor: "pointer", background: "none", border: "none", padding: "2px 6px" },
    barBg: { height: 3, background: m.cardBorder, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
    barFill: (pct) => ({ height: "100%", borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg, ${a.color}, ${a.color}99)`, boxShadow: `0 0 6px ${a.color}60` }),
    empty: { textAlign: "center", padding: "60px 20px", color: m.textMuted, fontSize: 14 },
    logoutBtn: { margin: "auto 10px 0", padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    modal: { background: m.sidebar, borderRadius: 16, border: `1px solid ${m.cardBorder}`, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: m.text, marginBottom: 20 },
    input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${m.cardBorder}`, background: m.bg, color: m.text, fontSize: 13, marginBottom: 12, outline: "none", fontFamily: "'DM Sans', sans-serif", colorScheme: mode === "light" ? "light" : "dark" },
    select: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${m.cardBorder}`, background: m.bg, color: m.text, fontSize: 13, marginBottom: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" },
    modalBtns: { display: "flex", gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${m.cardBorder}`, background: "transparent", color: m.textMuted, fontSize: 13, cursor: "pointer" },
    saveBtn: { flex: 1, padding: "10px", borderRadius: 8, border: "none", background: a.color, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 14px ${a.color}60` },
  };

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.logo}>
          <span style={{ color: m.text }}>Client</span>
          <span style={{ color: a.color }}>Flow</span>
        </div>
        <div style={s.navLabel}>Menu</div>
        {[["Dashboard","🏠","/dashboard"],["Projects","📁","/projects"],["Clients","👥","/clients"],["Invoices","📄","/invoices"],["Messages","💬","/messages"]].map(([label, icon, path]) => (
          <div key={label} style={s.navItem(label === "Projects")} onClick={() => navigate(path)}>
            <div style={s.navDot(label === "Projects")}></div>
            {icon} {label}
          </div>
        ))}
        <div style={s.logoutBtn} onClick={() => { logout(); navigate("/login"); }}>
          🚪 Logout
        </div>
      </div>

      <div style={s.main}>
        <div style={s.topbar}>
          <div style={s.pageTitle}>Projects</div>
          <button style={s.addBtn} onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
        <div style={s.content}>
          {loading ? (
            <div style={s.empty}>Loading projects...</div>
          ) : projects.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div>No projects yet</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Click "+ New Project" to get started</div>
            </div>
          ) : (
            <div style={s.grid}>
              {projects.map((p) => (
                <div key={p._id} style={s.card}>
                  <div style={s.cardAccent}></div>
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{p.name}</div>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 600, ...statusColor(p.status) }}>{p.status}</span>
                  </div>
                  <div style={s.cardDesc}>{p.description || "No description"}</div>
                  <div style={s.barBg}><div style={s.barFill(p.progress)}></div></div>
                  <div style={{ fontSize: 10, color: m.textMuted, marginBottom: 4 }}>{p.progress}% complete</div>
                  <div style={s.cardFooter}>
                    <div style={s.dueDate}>{p.dueDate ? `Due ${new Date(p.dueDate).toLocaleDateString()}` : "No due date"}</div>
                    <button style={s.deleteBtn} onClick={() => handleDelete(p._id)}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>New Project</div>
            <input style={s.input} placeholder="Project name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea style={{ ...s.input, height: 80, resize: "vertical" }} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select style={s.select} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <input style={s.input} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleCreate}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;