import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import ThemePicker from "../components/ThemePicker.jsx";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import DashboardCharts from "../components/DashboardCharts.jsx";
import DateRangeFilter from "../components/DateRangeFilter.jsx";
import { getRecent } from "../utils/recentItems";

const defaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

const greetingLine = (name) => {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name || "there"}`;
};

const statList = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};
const statItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
const panelIn = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const Dashboard = () => {
  const user      = useAuthStore((s) => s.user);
  const isClient  = user?.role === "client";
  const accent    = useAuthStore((s) => s.accent);
  const mode      = useAuthStore((s) => s.mode);
  const navigate  = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent]   = useState([]);
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().from);
  const [dateTo, setDateTo]     = useState(() => defaultDateRange().to);

  const a = accents[accent] || accents["earthy"];
  const m = modes[mode]     || modes["earthy"];

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/auth/stats", {
        params: { from: dateFrom, to: dateTo },
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!user?._id) return;
    setRecent(getRecent(user._id));
    const onFocus = () => setRecent(getRecent(user._id));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?._id]);

  const statusColor = (status) => ({
    Active:    { background: "rgba(52,211,153,0.12)",  color: "#34d399" },
    Review:    { background: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
    Completed: { background: "rgba(45,212,191,0.14)", color: "#14b8a6" },
    "On Hold": { background: "rgba(248,113,113,0.12)", color: "#f87171" },
  }[status] || {});

  const s = {
    controls: { display: "flex", alignItems: "center", gap: 8 },
    avatar: {
      width: 32, height: 32, borderRadius: "50%",
      background: a.color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 12, fontWeight: 700,
      color: "#fff", boxShadow: `0 0 12px ${a.color}60`,
      marginLeft: 4,
    },
    content: { padding: "24px 28px", flex: 1 },
    row: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 14,
    },
    card: {
      background: m.card, borderRadius: 14,
      border: `1px solid ${m.cardBorder}`,
      padding: 20, boxShadow: m.shadow,
      transition: "all 0.3s ease",
    },
    cardTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600,
      color: m.textMuted, letterSpacing: "0.8px",
      textTransform: "uppercase", marginBottom: 16,
    },
    pItem: {
      padding: "10px 12px", borderRadius: 8,
      border: `1px solid ${m.cardBorder}`,
      marginBottom: 8, transition: "all 0.2s",
      cursor: "pointer", background: m.bg,
    },
    pTop: {
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginBottom: 6,
    },
    pName: { fontSize: 13, fontWeight: 500, color: m.text },
    barBg: {
      height: 3, background: m.cardBorder,
      borderRadius: 2, overflow: "hidden",
    },
    barFill: (pct) => ({
      height: "100%", borderRadius: 2, width: `${pct}%`,
      background: `linear-gradient(90deg, ${a.color}, ${a.color}99)`,
      transition: "width 0.8s ease",
    }),
    actionItem: {
      padding: "12px 16px", borderRadius: 10,
      border: `1px solid ${m.cardBorder}`,
      marginBottom: 8, cursor: "pointer",
      fontSize: 13, color: m.text,
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      transition: "all 0.2s", background: m.bg,
    },
    arrow: { color: a.color, fontSize: 16, transition: "transform 0.2s" },
    recentRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    recentChip: {
      padding: "8px 12px",
      borderRadius: 8,
      border: `1px solid ${m.cardBorder}`,
      fontSize: 12,
      color: m.text,
      cursor: "pointer",
      background: m.bg,
      transition: "all 0.2s",
    },
  };

  const statCards = stats ? [
    { label: "Projects", value: stats.projects, sub: "", icon: "🗂️", to: "/projects" },
    ...(isClient
      ? []
      : [{ label: "Clients", value: stats.clients, sub: "", icon: "🤝", to: "/clients" }]),
    { label: "Pending Invoices", value: stats.pendingInvoices, sub: "", icon: "🧾", to: "/invoices" },
    {
      label: isClient ? "Paid to date" : "Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      sub: "",
      icon: "💰",
      to: "/invoices",
    },
  ] : [
    { label: "Projects", value: "—", sub: "", icon: "🗂️" },
    ...(isClient ? [] : [{ label: "Clients", value: "—", sub: "", icon: "🤝" }]),
    { label: "Pending Invoices", value: "—", sub: "", icon: "🧾" },
    { label: "Revenue", value: "—", sub: "", icon: "💰" },
  ];

  const quickActions = isClient
    ? [
        { label: "📨 Messages", path: "/messages" },
        { label: "🗃️ Files", path: "/files" },
        { label: "🧾 Invoices", path: "/invoices" },
      ]
    : [
        { label: "➕ New Project", path: "/projects" },
        { label: "🤝 Add Client", path: "/clients" },
        { label: "🧾 New Invoice", path: "/invoices" },
        { label: "📨 Messages", path: "/messages" },
        { label: "🗃️ Files", path: "/files" },
      ];

  return (
    <Layout>
      <PageHeader title={`${greetingLine(user?.name)} 👋`}>
        <div style={s.controls}>
          <ThemePicker variant="header" />
          <Motion.div
            style={s.avatar}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </Motion.div>
        </div>
      </PageHeader>

      <div style={s.content}>
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          accent={a}
          surface={m}
          onChange={({ from, to }) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />

        <Motion.div
          className="dashboard-stats-grid"
          style={{ marginBottom: 24 }}
          variants={statList}
          initial="hidden"
          animate="show"
        >
          {statCards.map((st) => {
            const { to, ...card } = st;
            return (
              <Motion.div key={st.label} variants={statItem} style={{ height: "100%" }}>
                <StatCard
                  {...card}
                  onClick={to ? () => navigate(to) : undefined}
                />
              </Motion.div>
            );
          })}
        </Motion.div>

        <DashboardCharts
          revenueSeries={stats?.revenueSeries}
          invoiceStatusMix={stats?.invoiceStatusMix}
          m={m}
          a={a}
          loading={loading}
        />

        <div style={s.row}>
          <Motion.div style={s.card} variants={panelIn} initial="hidden" animate="show">
            <div style={s.cardTitle}>Recent Projects</div>
            {loading ? (
              <EmptyState icon="⏳" title="Loading..." subtitle="" />
            ) : !stats?.recentProjects?.length ? (
              <EmptyState
                icon="🗂️"
                title="No projects yet"
                subtitle={
                  isClient
                    ? "Your freelancer will add you to a project you can open here."
                    : "Create your first project to get started"
                }
                action={isClient ? undefined : "Create Project"}
                onAction={isClient ? undefined : () => navigate("/projects")}
              />
            ) : (
              stats.recentProjects.map((p) => (
                <Motion.div
                  key={p._id}
                  style={s.pItem}
                  onClick={() => navigate("/projects")}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${a.color}45`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = m.cardBorder;
                  }}
                >
                  <div style={s.pTop}>
                    <span style={s.pName}>{p.name}</span>
                    <span style={{
                      fontSize: 9, padding: "2px 8px",
                      borderRadius: 20, fontWeight: 600,
                      ...statusColor(p.status),
                    }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={s.barBg}>
                    <div style={s.barFill(p.progress)}></div>
                  </div>
                </Motion.div>
              ))
            )}
          </Motion.div>

          <Motion.div style={s.card} variants={panelIn} initial="hidden" animate="show" transition={{ delay: 0.06 }}>
            <div style={s.cardTitle}>Quick Actions</div>
            {quickActions.map((action) => (
              <Motion.div
                key={action.label}
                role="button"
                tabIndex={0}
                style={s.actionItem}
                onClick={() => navigate(action.path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(action.path);
                  }
                }}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${a.color}45`;
                  e.currentTarget.style.background = a.glow;
                  const ar = e.currentTarget.querySelector(".arrow");
                  if (ar) ar.style.transform = "translateX(6px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = m.cardBorder;
                  e.currentTarget.style.background = m.bg;
                  const ar = e.currentTarget.querySelector(".arrow");
                  if (ar) ar.style.transform = "translateX(0)";
                }}
              >
                {action.label}
                <span className="arrow" style={s.arrow}>→</span>
              </Motion.div>
            ))}
          </Motion.div>
        </div>

        <Motion.div style={{ ...s.card, marginTop: 14 }} variants={panelIn} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
          <div style={s.cardTitle}>Recently viewed</div>
          {recent.length === 0 ? (
            <div style={{ fontSize: 12, color: m.textMuted }}>
              Open a client, project, or invoice — it will show up here for quick access.
            </div>
          ) : (
            <div style={s.recentRow}>
              {recent.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  style={s.recentChip}
                  onClick={() => navigate(r.path)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${a.color}50`;
                    e.currentTarget.style.background = a.glow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = m.cardBorder;
                    e.currentTarget.style.background = m.bg;
                  }}
                >
                  <span style={{ opacity: 0.75, marginRight: 6 }}>
                    {r.type === "client"
                      ? "🤝"
                      : r.type === "project"
                        ? "🗂️"
                        : "🧾"}
                  </span>
                  {r.title}
                </button>
              ))}
            </div>
          )}
        </Motion.div>
      </div>
    </Layout>
  );
};

export default Dashboard;