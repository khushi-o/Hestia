import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [accent, setAccent] = useState("violet");
  const [mode, setMode] = useState("night");

  const a = accents[accent];
  const m = modes[mode];

  const handleLogout = () => { logout(); navigate("/login"); };

  const stats = [
    { label: "Projects", value: "12", sub: "↑ 2 this month" },
    { label: "Clients",  value: "8",  sub: "↑ 1 this week"  },
    { label: "Revenue",  value: "₹2.4L", sub: "↑ 18% vs last" },
    { label: "Messages", value: "7",  sub: "unread"          },
  ];

  const projects = [
    { name: "Brand Redesign", client: "Acme Corp", progress: 72, status: "Active" },
    { name: "E-commerce App", client: "Zeta Labs", progress: 45, status: "Review" },
    { name: "Mobile App UI",  client: "Nova Inc",  progress: 88, status: "Active" },
  ];

  const activity = [
    { text: "Invoice sent to Acme Corp", time: "2m ago" },
    { text: "New message from Zeta Labs", time: "1h ago" },
    { text: "File uploaded to Brand project", time: "3h ago" },
    { text: "Project approved by Nova Inc", time: "1d ago" },
  ];

  const s = {
    app: {
      display: "flex", minHeight: "100vh",
      background: m.bg, color: m.text,
      fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.3s ease",
    },
    sidebar: {
      width: 220, background: m.sidebar, display: "flex",
      flexDirection: "column", padding: "24px 0",
      borderRight: `1px solid ${m.cardBorder}`,
      transition: "all 0.3s ease", flexShrink: 0,
    },
    logo: {
      fontFamily: "'Syne', sans-serif", fontSize: 18,
      fontWeight: 700, padding: "0 20px 32px",
      letterSpacing: "-0.3px",
    },
    navLabel: {
      fontSize: 9, color: m.textMuted, letterSpacing: "1.5px",
      textTransform: "uppercase", padding: "0 12px 6px 20px",
    },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", margin: "1px 10px",
      borderRadius: 8, fontSize: 13, cursor: "pointer",
      color: active ? m.text : m.textMuted,
      background: active ? a.glow : "transparent",
      transition: "all 0.2s",
    }),
    navDot: (active) => ({
      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
      background: active ? a.color : m.textMuted,
      boxShadow: active ? `0 0 8px ${a.color}` : "none",
      transition: "all 0.2s",
    }),
    main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
    topbar: {
      padding: "16px 28px", display: "flex", alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${m.cardBorder}`,
      background: m.topbar, transition: "all 0.3s ease",
    },
    pageTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 17,
      fontWeight: 700, color: m.text,
    },
    controls: { display: "flex", alignItems: "center", gap: 14 },
    modeBtn: (active) => ({
      padding: "5px 12px", borderRadius: 20, fontSize: 11,
      fontWeight: 500, cursor: "pointer", border: "none",
      background: active ? a.color : m.card,
      color: active ? "#fff" : m.textMuted,
      boxShadow: active ? `0 0 12px ${a.color}60` : "none",
      transition: "all 0.2s",
    }),
    accentDot: (key) => ({
      width: 16, height: 16, borderRadius: "50%",
      background: accents[key].color, cursor: "pointer",
      border: accent === key ? `2px solid ${m.text}` : "2px solid transparent",
      boxShadow: accent === key ? `0 0 10px ${accents[key].color}` : "none",
      transition: "all 0.2s", flexShrink: 0,
    }),
    avatar: {
      width: 32, height: 32, borderRadius: "50%",
      background: a.color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff",
      boxShadow: `0 0 12px ${a.color}80`,
    },
    content: { padding: "24px 28px", flex: 1 },
    statsGrid: {
      display: "grid", gridTemplateColumns: "repeat(4,1fr)",
      gap: 14, marginBottom: 20,
    },
    stat: {
      background: m.statBg, borderRadius: 14,
      padding: "14px 16px", border: `1px solid ${m.cardBorder}`,
      boxShadow: m.shadow, position: "relative", overflow: "hidden",
      transition: "all 0.3s ease",
    },
    statAccent: {
      position: "absolute", top: 0, left: 0, right: 0, height: 2,
      background: a.color, opacity: 0.7,
    },
    statLabel: { fontSize: 10, color: m.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" },
    statValue: { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: m.text },
    statSub:   { fontSize: 10, color: a.color, marginTop: 3 },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    card: {
      background: m.card, borderRadius: 14,
      border: `1px solid ${m.cardBorder}`,
      padding: 18, boxShadow: m.shadow,
      transition: "all 0.3s ease",
    },
    cardTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600,
      color: m.textMuted, letterSpacing: "0.8px",
      textTransform: "uppercase", marginBottom: 14,
    },
    pItem: { marginBottom: 14 },
    pTop:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    pName: { fontSize: 13, fontWeight: 500, color: m.text },
    pClient:{ fontSize: 11, color: m.textMuted, marginBottom: 6 },
    badge: (status) => ({
      fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
      background: status === "Active" ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
      color: status === "Active" ? "#34d399" : "#fbbf24",
    }),
    barBg:   { height: 3, background: m.cardBorder, borderRadius: 2, overflow: "hidden" },
    barFill: (pct) => ({
      height: "100%", borderRadius: 2, width: `${pct}%`,
      background: `linear-gradient(90deg, ${a.color}, ${a.color}99)`,
      boxShadow: `0 0 6px ${a.color}60`,
      transition: "all 0.3s",
    }),
    actItem: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    actDot:  { width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0, boxShadow: `0 0 6px ${a.color}` },
    actText: { fontSize: 12, color: m.textMuted, flex: 1 },
    actTime: { fontSize: 10, color: m.textMuted, opacity: 0.6, whiteSpace: "nowrap" },
    logoutBtn: {
      margin: "auto 10px 0", padding: "9px 12px", borderRadius: 8,
      fontSize: 13, color: "#f87171", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 10,
    },
  };

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <span style={{ color: m.text }}>Client</span>
          <span style={{ color: a.color }}>Flow</span>
        </div>
        <div style={s.navLabel}>Menu</div>
        {[["Dashboard","🏠","/dashboard"],["Projects","📁","/projects"],["Clients","👥","/clients"],["Invoices","📄","/invoices"],["Messages","💬","/messages"]].map(([label, icon, path], i) => (
            <div key={label} style={s.navItem(i === 0)} onClick={() => navigate(path)}>
            <div style={s.navDot(i === 0)}></div>
            {icon} {label}
            </div>
        ))}
        <div style={s.logoutBtn} onClick={handleLogout}>🚪 Logout</div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={s.pageTitle}>Good morning, {user?.name} 👋</div>
          <div style={s.controls}>
            {/* Mode buttons */}
            {["light","dark","night"].map(md => (
              <button key={md} onClick={() => setMode(md)} style={s.modeBtn(mode === md)}>
                {md === "light" ? "☀️ Light" : md === "dark" ? "🌙 Dark" : "🌑 Night"}
              </button>
            ))}
            {/* Accent dots */}
            <div style={{ display: "flex", gap: 5 }}>
              {Object.keys(accents).map(key => (
                <div key={key} onClick={() => setAccent(key)} style={s.accentDot(key)} />
              ))}
            </div>
            <div style={s.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          </div>
        </div>

        {/* Content */}
        <div style={s.content}>
          {/* Stats */}
          <div style={s.statsGrid}>
            {stats.map(st => (
              <div key={st.label} style={s.stat}>
                <div style={s.statAccent}></div>
                <div style={s.statLabel}>{st.label}</div>
                <div style={s.statValue}>{st.value}</div>
                <div style={s.statSub}>{st.sub}</div>
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div style={s.row}>
            {/* Projects card */}
            <div style={s.card}>
              <div style={s.cardTitle}>Active Projects</div>
              {projects.map(p => (
                <div key={p.name} style={s.pItem}>
                  <div style={s.pTop}>
                    <span style={s.pName}>{p.name}</span>
                    <span style={s.badge(p.status)}>{p.status}</span>
                  </div>
                  <div style={s.pClient}>{p.client}</div>
                  <div style={s.barBg}>
                    <div style={s.barFill(p.progress)}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity card */}
            <div style={s.card}>
              <div style={s.cardTitle}>Recent Activity</div>
              {activity.map((a, i) => (
                <div key={i} style={s.actItem}>
                  <div style={s.actDot}></div>
                  <div style={s.actText}>{a.text}</div>
                  <div style={s.actTime}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;