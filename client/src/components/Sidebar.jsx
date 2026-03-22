import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const NAV = [
  ["Dashboard", "🏠", "/dashboard"],
  ["Projects",  "📁", "/projects"],
  ["Clients",   "👥", "/clients"],
  ["Invoices",  "📄", "/invoices"],
  ["Messages",  "💬", "/messages"],
  ["Files",     "📎", "/files"],
  ["Settings", "⚙️", "/profile"],
];

const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const logout    = useAuthStore((s) => s.logout);
  const accent    = useAuthStore((s) => s.accent);
  const mode      = useAuthStore((s) => s.mode);

  const a = accents[accent];
  const m = modes[mode];

  const s = {
    sidebar: {
      width: 220, background: m.sidebar, display: "flex",
      flexDirection: "column", padding: "24px 0",
      borderRight: `1px solid ${m.cardBorder}`,
      flexShrink: 0, height: "100vh", position: "sticky",
      top: 0, transition: "all 0.3s ease",
    },
    logo: {
      fontFamily: "'Syne', sans-serif", fontSize: 18,
      fontWeight: 700, padding: "0 20px 32px", letterSpacing: "-0.3px",
      cursor: "pointer",
    },
    navLabel: {
      fontSize: 9, color: m.textMuted, letterSpacing: "1.5px",
      textTransform: "uppercase", padding: "0 12px 8px 20px",
    },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", margin: "1px 10px", borderRadius: 8,
      fontSize: 13, cursor: "pointer",
      color: active ? m.text : m.textMuted,
      background: active ? a.glow : "transparent",
      transition: "all 0.2s ease",
      transform: active ? "translateX(2px)" : "translateX(0)",
      fontWeight: active ? 500 : 400,
    }),
    navDot: (active) => ({
      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
      background: active ? a.color : m.textMuted,
      boxShadow: active ? `0 0 8px ${a.color}` : "none",
      transition: "all 0.2s ease",
      transform: active ? "scale(1.3)" : "scale(1)",
    }),
    divider: {
      height: 1, background: m.cardBorder,
      margin: "12px 20px",
    },
    logoutBtn: {
      margin: "auto 10px 0", padding: "10px 12px", borderRadius: 8,
      fontSize: 13, color: "#f87171", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 10,
      transition: "all 0.2s",
      border: "none", background: "transparent",
    },
  };

  return (
    <div style={s.sidebar}>
      <div style={s.logo} onClick={() => navigate("/dashboard")}>
        <span style={{ color: m.text }}>Client</span>
        <span style={{ color: a.color }}>Flow</span>
      </div>
      <div style={s.navLabel}>Menu</div>
      {NAV.map(([label, icon, path]) => {
        const active = location.pathname === path;
        return (
          <div
            key={label}
            style={s.navItem(active)}
            onClick={() => navigate(path)}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = m.text;
              if (!active) e.currentTarget.style.background = m.cardBorder;
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = m.textMuted;
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={s.navDot(active)}></div>
            {icon} {label}
          </div>
        );
      })}
      <div style={s.divider}></div>
      <button
        style={s.logoutBtn}
        onClick={() => { logout(); navigate("/login"); }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        🚪 Logout
      </button>
    </div>
  );
};

export default Sidebar;