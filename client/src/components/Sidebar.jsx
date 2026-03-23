import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const STORAGE_KEY = "hestia-sidebar-collapsed";
const W_EXPANDED = 220;
const W_COLLAPSED = 72;

const NAV = [
  ["Dashboard",     "📊", "/dashboard"],
  ["Projects",      "🗂️", "/projects"],
  ["Clients",       "🤝", "/clients"],
  ["Invoices",      "🧾", "/invoices"],
  ["Messages",      "📨", "/messages"],
  ["Files",         "🗃️", "/files"],
  ["Notifications", "📬", "/notifications"],
  ["Settings",      "🎛️", "/profile"],
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout   = useAuthStore((s) => s.logout);
  const accent   = useAuthStore((s) => s.accent);
  const mode     = useAuthStore((s) => s.mode);
  const [unread, setUnread] = useState(0);
  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );

  const a = accents[accent] || accents["earthy"];
  const m = modes[mode]     || modes["earthy"];
  const w = collapsed ? W_COLLAPSED : W_EXPANDED;

  const setCollapsedPersist = (next) => {
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  };

  const fetchUnread = async () => {
    try {
      const res = await API.get("/notifications");
      setUnread(res.data.filter((n) => !n.read).length);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchUnread();
    }, 0);
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  const s = {
    sidebar: {
      width: w,
      background: m.sidebar,
      display: "flex",
      flexDirection: "column",
      padding: collapsed ? "16px 0 max(12px, env(safe-area-inset-bottom))" : "20px 0 max(12px, env(safe-area-inset-bottom))",
      borderRight: `1px solid ${m.cardBorder}`,
      flexShrink: 0,
      alignSelf: "stretch",
      minHeight: 0,
      height: "100%",
      maxHeight: "100%",
      transition: "width 0.28s ease, background 0.3s ease",
      overflowX: "hidden",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      boxSizing: "border-box",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "space-between",
      gap: collapsed ? 6 : 10,
      padding: collapsed ? "0 8px 14px" : "0 10px 16px",
      flexShrink: 0,
    },
    logoCluster: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      minWidth: 0,
      flex: collapsed ? "none" : 1,
    },
    collapseCompact: {
      width: 28,
      height: 28,
      padding: 0,
      borderRadius: 7,
      border: `1px solid ${m.cardBorder}`,
      background: m.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: m.textMuted,
      flexShrink: 0,
      transition: "all 0.2s",
    },
    logoMark: {
      width: 32,
      height: 32,
      borderRadius: 9,
      flexShrink: 0,
      boxShadow: `0 2px 10px ${a.color}28`,
    },
    logoText: {
      fontFamily: "'Syne', sans-serif",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: "-0.3px",
      whiteSpace: "nowrap",
    },
    navLabel: {
      fontSize: 9,
      color: m.textMuted,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      padding: collapsed ? "0 8px 8px" : "0 12px 8px 20px",
      opacity: collapsed ? 0 : 1,
      height: collapsed ? 0 : "auto",
      overflow: "hidden",
      flexShrink: 0,
    },
    navScroll: {
      flex: "1 1 0",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    },
    navItem: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: collapsed ? 0 : 10,
      padding: collapsed ? "10px 8px" : "10px 12px",
      margin: "1px 8px",
      borderRadius: 8,
      fontSize: 13,
      cursor: "pointer",
      color: active ? m.text : m.textMuted,
      background: active ? a.glow : "transparent",
      transition: "all 0.2s ease",
      fontWeight: active ? 500 : 400,
      justifyContent: collapsed ? "center" : "flex-start",
      position: "relative",
    }),
    navDot: (active) => ({
      width: 6,
      height: 6,
      borderRadius: "50%",
      flexShrink: 0,
      background: active ? a.color : m.textMuted,
      boxShadow: active ? `0 0 8px ${a.color}` : "none",
      transition: "all 0.2s ease",
    }),
    badge: {
      marginLeft: "auto",
      background: a.color,
      color: "#fff",
      fontSize: 9,
      fontWeight: 700,
      padding: "1px 6px",
      borderRadius: 20,
      minWidth: 16,
      textAlign: "center",
    },
    badgeDot: {
      position: "absolute",
      top: 6,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#f87171",
      border: `2px solid ${m.sidebar}`,
    },
    signOutWrap: {
      marginTop: "auto",
      paddingTop: 12,
      borderTop: `1px solid ${m.cardBorder}`,
      flexShrink: 0,
      background: m.sidebar,
    },
    logoutNavBtn: {
      display: "flex",
      alignItems: "center",
      gap: collapsed ? 0 : 10,
      padding: collapsed ? "10px 8px" : "10px 12px",
      margin: "1px 8px",
      borderRadius: 8,
      fontSize: 13,
      cursor: "pointer",
      color: "#f87171",
      background: "transparent",
      border: "1px solid transparent",
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 500,
      justifyContent: collapsed ? "center" : "flex-start",
      width: "calc(100% - 16px)",
      boxSizing: "border-box",
      transition: "all 0.2s",
    },
  };

  return (
    <div style={s.sidebar}>
      <div style={s.topBar}>
        <div
          style={s.logoCluster}
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/dashboard");
            }
          }}
        >
          <img src="/favicon.svg" alt="" width={32} height={32} style={s.logoMark} />
          {!collapsed && (
            <div style={s.logoText}>
              <span style={{ color: a.color }}>Hes</span>
              <span style={{ color: m.text }}>tia</span>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={s.collapseCompact}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsedPersist(!collapsed);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${a.color}45`;
            e.currentTarget.style.color = m.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = m.cardBorder;
            e.currentTarget.style.color = m.textMuted;
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      <div style={s.navLabel}>Menu</div>

      <div style={s.navScroll}>
        <div
          title="Search"
          style={s.navItem(false)}
          onClick={() => window.dispatchEvent(new Event("hestia-open-search"))}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = m.text;
            e.currentTarget.style.background = m.cardBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = m.textMuted;
            e.currentTarget.style.background = "transparent";
          }}
        >
          {!collapsed && <div style={s.navDot(false)} />}
          <span style={{ fontSize: 15 }} aria-hidden>🔍</span>
          {!collapsed && (
            <>
              <span>Search</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  color: m.textMuted,
                  opacity: 0.85,
                }}
              >
                ⌘K
              </span>
            </>
          )}
        </div>

        {NAV.map(([label, icon, path]) => {
          const active = location.pathname === path;
          return (
            <div
              key={path}
              title={collapsed ? label : undefined}
            >
              <div
                style={s.navItem(active)}
                onClick={() => navigate(path)}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = m.text;
                    e.currentTarget.style.background = m.cardBorder;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = m.textMuted;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {!collapsed && <div style={s.navDot(active)} />}
                <span style={{ fontSize: 15 }} aria-hidden>{icon}</span>
                {!collapsed && (
                  <>
                    <span>{label}</span>
                    {label === "Notifications" && unread > 0 && (
                      <span style={s.badge}>{unread}</span>
                    )}
                  </>
                )}
                {collapsed && label === "Notifications" && unread > 0 && (
                  <span style={s.badgeDot} title={`${unread} unread`} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.signOutWrap}>
        <button
          type="button"
          title={collapsed ? "Sign out" : undefined}
          aria-label="Sign out"
          style={s.logoutNavBtn}
          onClick={() => { logout(); navigate("/login"); }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(248,113,113,0.1)";
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          {!collapsed && <div style={s.navDot(false)} />}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
