import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const socket = io("http://localhost:5000");

const Messages = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const accent = useAuthStore((state) => state.accent);
  const mode = useAuthStore((state) => state.mode);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off("receive_message");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectProject = async (project) => {
    setSelectedProject(project);
    setLoading(true);
    socket.emit("join_project", project._id);
    try {
      const res = await API.get(`/messages/${project._id}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedProject) return;
    const msg = {
      projectId: selectedProject._id,
      text: text.trim(),
      senderName: user?.name,
      sender: user?._id,
      createdAt: new Date().toISOString(),
    };
    socket.emit("send_message", msg);
    try {
      await API.post(`/messages/${selectedProject._id}`, { text: text.trim() });
    } catch (err) {
      console.error(err);
    }
    setText("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isMe = (msg) => msg.sender === user?._id || msg.senderName === user?.name;

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const s = {
    app: { display: "flex", minHeight: "100vh", background: m.bg, color: m.text, fontFamily: "'DM Sans', sans-serif" },
    sidebar: { width: 220, background: m.sidebar, display: "flex", flexDirection: "column", padding: "24px 0", borderRight: `1px solid ${m.cardBorder}`, flexShrink: 0 },
    logo: { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, padding: "0 20px 32px", letterSpacing: "-0.3px" },
    navLabel: { fontSize: 9, color: m.textMuted, letterSpacing: "1.5px", textTransform: "uppercase", padding: "0 12px 6px 20px" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", margin: "1px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: active ? m.text : m.textMuted, background: active ? a.glow : "transparent", transition: "all 0.2s" }),
    navDot: (active) => ({ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: active ? a.color : m.textMuted, boxShadow: active ? `0 0 8px ${a.color}` : "none" }),
    main: { flex: 1, display: "flex", minWidth: 0 },
    projectList: { width: 260, borderRight: `1px solid ${m.cardBorder}`, display: "flex", flexDirection: "column", background: m.sidebar },
    projectListHeader: { padding: "16px 20px", borderBottom: `1px solid ${m.cardBorder}`, fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: m.text },
    projectItem: (active) => ({ padding: "12px 20px", cursor: "pointer", borderBottom: `1px solid ${m.cardBorder}`, background: active ? a.glow : "transparent", transition: "all 0.2s" }),
    projectItemName: (active) => ({ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? m.text : m.textMuted }),
    projectItemSub: { fontSize: 11, color: m.textMuted, marginTop: 2 },
    chatArea: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
    chatHeader: { padding: "16px 24px", borderBottom: `1px solid ${m.cardBorder}`, background: m.topbar, display: "flex", alignItems: "center", gap: 10 },
    chatHeaderDot: { width: 8, height: 8, borderRadius: "50%", background: a.color, boxShadow: `0 0 8px ${a.color}` },
    chatHeaderTitle: { fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: m.text },
    messages: { flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 },
    msgRow: (me) => ({ display: "flex", justifyContent: me ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }),
    msgAvatar: { width: 28, height: 28, borderRadius: "50%", background: a.color + "30", border: `1px solid ${a.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: a.color, flexShrink: 0 },
    msgBubble: (me) => ({ maxWidth: "65%", padding: "10px 14px", borderRadius: me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: me ? a.color : m.card, color: me ? "#fff" : m.text, fontSize: 13, lineHeight: 1.5, border: me ? "none" : `1px solid ${m.cardBorder}`, boxShadow: me ? `0 0 14px ${a.color}40` : m.shadow }),
    msgName: { fontSize: 10, color: m.textMuted, marginBottom: 4, fontWeight: 600 },
    msgTime: { fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" },
    inputArea: { padding: "16px 24px", borderTop: `1px solid ${m.cardBorder}`, background: m.topbar, display: "flex", gap: 10, alignItems: "flex-end" },
    input: { flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${m.cardBorder}`, background: m.bg, color: m.text, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "none", maxHeight: 100, minHeight: 40 },
    sendBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: a.color, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 14px ${a.color}60`, whiteSpace: "nowrap" },
    empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: m.textMuted, fontSize: 14, flexDirection: "column", gap: 8 },
    logoutBtn: { margin: "auto 10px 0", padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 },
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
        {[["Dashboard","🏠","/dashboard"],["Projects","📁","/projects"],["Clients","👥","/clients"],["Invoices","📄","/invoices"],["Messages","💬","/messages"]].map(([label, icon, path]) => (
          <div key={label} style={s.navItem(label === "Messages")} onClick={() => navigate(path)}>
            <div style={s.navDot(label === "Messages")}></div>
            {icon} {label}
          </div>
        ))}
        <div style={s.logoutBtn} onClick={() => { logout(); navigate("/login"); }}>
          🚪 Logout
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Project list */}
        <div style={s.projectList}>
          <div style={s.projectListHeader}>💬 Projects</div>
          {projects.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: m.textMuted }}>
              No projects yet. <span style={{ color: a.color, cursor: "pointer" }} onClick={() => navigate("/projects")}>Create one</span>
            </div>
          ) : (
            projects.map((p) => (
              <div key={p._id} style={s.projectItem(selectedProject?._id === p._id)} onClick={() => selectProject(p)}>
                <div style={s.projectItemName(selectedProject?._id === p._id)}>{p.name}</div>
                <div style={s.projectItemSub}>{p.status}</div>
              </div>
            ))
          )}
        </div>

        {/* Chat area */}
        <div style={s.chatArea}>
          {!selectedProject ? (
            <div style={s.empty}>
              <div style={{ fontSize: 40 }}>💬</div>
              <div>Select a project to start chatting</div>
            </div>
          ) : (
            <>
              <div style={s.chatHeader}>
                <div style={s.chatHeaderDot}></div>
                <div style={s.chatHeaderTitle}>{selectedProject.name}</div>
              </div>

              <div style={s.messages}>
                {loading ? (
                  <div style={{ textAlign: "center", color: m.textMuted, fontSize: 13 }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: m.textMuted, fontSize: 13, marginTop: 40 }}>
                    No messages yet — say hello! 👋
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} style={s.msgRow(isMe(msg))}>
                      {!isMe(msg) && (
                        <div style={s.msgAvatar}>
                          {msg.senderName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        {!isMe(msg) && <div style={s.msgName}>{msg.senderName}</div>}
                        <div style={s.msgBubble(isMe(msg))}>
                          {msg.text}
                          <div style={s.msgTime}>{formatTime(msg.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div style={s.inputArea}>
                <textarea
                  style={s.input}
                  placeholder="Type a message... (Enter to send)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button style={s.sendBtn} onClick={sendMessage}>Send →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;