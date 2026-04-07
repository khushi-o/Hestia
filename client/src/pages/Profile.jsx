import { useState, useEffect } from "react";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import ThemePicker from "../components/ThemePicker.jsx";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";

const Profile = () => {
  const user      = useAuthStore((s) => s.user);
  const accent    = useAuthStore((s) => s.accent);
  const mode      = useAuthStore((s) => s.mode);
  const login     = useAuthStore((s) => s.login);

  const a = accents[accent];
  const m = modes[mode];

  const [stats, setStats]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState({ text: "", type: "" });
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passForm, setPassForm]       = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/auth/profile");
      setProfileForm({ name: res.data.name, email: res.data.email });
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      const res = await API.get("/auth/stats", {
        params: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        },
      });
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleProfileSave = async () => {
    if (!profileForm.name || !profileForm.email)
      return showMsg("Name and email are required", "error");
    setSaving(true);
    try {
      const res = await API.put("/auth/profile", profileForm);
      const updatedUser = { ...user, name: res.data.name, email: res.data.email };
      login({ ...updatedUser, token: user.token });
      showMsg("Profile updated successfully!");
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to update profile", "error");
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async () => {
    if (!passForm.currentPassword || !passForm.newPassword)
      return showMsg("All password fields are required", "error");
    if (passForm.newPassword !== passForm.confirmPassword)
      return showMsg("New passwords do not match", "error");
    if (passForm.newPassword.length < 6)
      return showMsg("Password must be at least 6 characters", "error");
    setSaving(true);
    try {
      await API.put("/auth/profile", {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showMsg("Password changed successfully!");
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to change password", "error");
    } finally { setSaving(false); }
  };

  const initials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const s = {
    content: { padding: "28px", flex: 1, maxWidth: 900, margin: "0 auto", width: "100%" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
    card: {
      background: m.card, borderRadius: 14,
      border: `1px solid ${m.cardBorder}`, padding: 24,
      boxShadow: m.shadow, transition: "all 0.3s",
    },
    cardFull: {
      background: m.card, borderRadius: 14,
      border: `1px solid ${m.cardBorder}`, padding: 24,
      boxShadow: m.shadow, marginBottom: 20,
    },
    cardTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 14,
      fontWeight: 700, color: m.text, marginBottom: 20,
      paddingBottom: 12, borderBottom: `1px solid ${m.cardBorder}`,
    },
    avatarSection: {
      display: "flex", alignItems: "center",
      gap: 20, marginBottom: 24,
    },
    avatar: {
      width: 72, height: 72, borderRadius: "50%",
      background: `linear-gradient(135deg, ${a.color}, ${a.color}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 26, fontWeight: 700, color: "#fff",
      boxShadow: `0 0 24px ${a.color}50`, flexShrink: 0,
    },
    avatarInfo: {},
    avatarName: {
      fontFamily: "'Syne', sans-serif", fontSize: 20,
      fontWeight: 700, color: m.text, marginBottom: 4,
    },
    avatarRole: {
      fontSize: 12, padding: "3px 10px", borderRadius: 20,
      background: a.glow, color: a.color,
      fontWeight: 600, display: "inline-block",
    },
    statGrid: {
      display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
    },
    statBox: {
      background: m.bg, borderRadius: 10,
      border: `1px solid ${m.cardBorder}`, padding: "14px 16px",
      textAlign: "center", transition: "all 0.2s",
    },
    statVal: {
      fontFamily: "'Syne', sans-serif", fontSize: 22,
      fontWeight: 700, color: a.color, marginBottom: 4,
    },
    statLabel: { fontSize: 10, color: m.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" },
    fieldGroup: { marginBottom: 14 },
    label: {
      fontSize: 11, fontWeight: 600, color: m.textMuted,
      letterSpacing: "0.3px", marginBottom: 6, display: "block",
      textTransform: "uppercase",
    },
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 8,
      border: `1px solid ${m.cardBorder}`, background: m.bg,
      color: m.text, fontSize: 13, outline: "none",
      fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    saveBtn: {
      padding: "10px 24px", borderRadius: 8, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer",
      boxShadow: `0 0 14px ${a.color}60`, transition: "all 0.2s",
      marginTop: 8,
    },
    msg: (type) => ({
      padding: "10px 16px", borderRadius: 8, fontSize: 13,
      marginBottom: 14, fontWeight: 500,
      background: type === "success" ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
      color: type === "success" ? "#34d399" : "#f87171",
      border: `1px solid ${type === "success" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
    }),
  };

  return (
    <Layout>
      <PageHeader title="Profile & Settings" />
      <div style={s.content}>

        {/* Profile overview card */}
        <div style={s.cardFull}>
          <div style={s.avatarSection}>
            <div style={s.avatar}>{initials(user?.name)}</div>
            <div style={s.avatarInfo}>
              <div style={s.avatarName}>{user?.name}</div>
              <div style={s.avatarRole}>{user?.role}</div>
              <div style={{ fontSize: 12, color: m.textMuted, marginTop: 6 }}>{user?.email}</div>
            </div>
          </div>
          <div style={s.statGrid}>
            {[
              { label: "Projects",  value: stats?.projects        ?? "—" },
              { label: "Clients",   value: stats?.clients         ?? "—" },
              { label: "Invoices",  value: stats?.pendingInvoices ?? "—" },
              { label: "Revenue",   value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : "—" },
            ].map((st) => (
              <div
                key={st.label} style={s.statBox}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${a.color}40`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = m.cardBorder;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={s.statVal}>{st.value}</div>
                <div style={s.statLabel}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.grid}>
          {/* Edit profile */}
          <div style={s.card}>
            <div style={s.cardTitle}>✏️ Edit Profile</div>
            {msg.text && <div style={s.msg(msg.type)}>{msg.text}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Full Name</label>
              <input
                style={s.input}
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Your name"
                onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Email Address</label>
              <input
                style={s.input}
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="your@email.com"
                type="email"
                onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Role</label>
              <input
                style={{ ...s.input, opacity: 0.6, cursor: "not-allowed" }}
                value={user?.role} disabled
              />
            </div>
            <button
              style={s.saveBtn}
              onClick={handleProfileSave}
              disabled={saving}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Change password */}
          <div style={s.card}>
            <div style={s.cardTitle}>🔒 Change Password</div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Current Password</label>
              <input
                style={s.input} type="password"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>New Password</label>
              <input
                style={s.input} type="password"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                placeholder="••••••••"
                onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Confirm New Password</label>
              <input
                style={s.input} type="password"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
              />
            </div>
            <button
              style={s.saveBtn}
              onClick={handlePasswordSave}
              disabled={saving}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {saving ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>

        <div style={s.cardFull}>
          <div style={s.cardTitle}>🎨 Appearance</div>
          <ThemePicker variant="profile" />
        </div>
      </div>
    </Layout>
  );
};

export default Profile;