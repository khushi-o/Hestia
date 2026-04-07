import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";
import { getSocketUrl } from "../config/env.js";

const Messages = () => {
  const user   = useAuthStore((s) => s.user);
  const token  = useAuthStore((s) => s.token);
  const accent = useAuthStore((s) => s.accent);
  const mode   = useAuthStore((s) => s.mode);
  const navigate = useNavigate();
  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages]               = useState([]);
  const [text, setText]                       = useState("");
  const [loading, setLoading]                 = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const joinedRoomRef = useRef(null);
  const selectedProjectRef = useRef(null);

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), { auth: { token } });
    socketRef.current = socket;

    const joinSelectedRoom = () => {
      const sp = selectedProjectRef.current;
      if (!sp) return;
      socket.emit("join_project", sp._id, (res) => {
        if (res?.ok) joinedRoomRef.current = sp._id;
      });
    };

    socket.on("connect", joinSelectedRoom);
    socket.on("receive_message", (msg) => {
      const sp = selectedProjectRef.current;
      const pid =
        msg.projectId != null
          ? String(msg.projectId)
          : msg.project != null
            ? String(msg.project)
            : null;
      if (!sp || !pid || pid !== String(sp._id)) return;
      setMessages((prev) => {
        const id = msg._id != null ? String(msg._id) : null;
        if (id && prev.some((m) => m._id != null && String(m._id) === id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });
    return () => {
      socket.off("connect", joinSelectedRoom);
      socket.off("receive_message");
      socket.disconnect();
      socketRef.current = null;
      joinedRoomRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err) { console.error(err); }
  };

  const selectProject = async (project) => {
    const sock = socketRef.current;
    if (sock && joinedRoomRef.current) {
      sock.leave(String(joinedRoomRef.current));
      joinedRoomRef.current = null;
    }
    setSelectedProject(project);
    setLoading(true);
    if (sock) {
      sock.emit("join_project", project._id, (res) => {
        if (res?.ok) joinedRoomRef.current = project._id;
      });
    }
    try {
      const res = await API.get(`/messages/${project._id}`);
      setMessages(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedProject) return;
    const body = text.trim();
    try {
      await API.post(`/messages/${selectedProject._id}`, { text: body });
      setText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isMe = (msg) =>
    (msg.sender != null &&
      user?._id != null &&
      String(msg.sender) === String(user._id)) ||
    (msg.senderName && user?.name && msg.senderName === user.name);
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const s = {
    wrapper: {
      display: "flex", flex: 1, minWidth: 0,
      overflow: "hidden", height: "100%",
      position: "relative",
    },
    projectList: {
      width: 260, borderRight: `1px solid ${m.cardBorder}`,
      display: "flex", flexDirection: "column",
      background: m.sidebar, flexShrink: 0,
      height: "100%", overflowY: "auto",
    },
    projectListHeader: {
      padding: "16px 20px", borderBottom: `1px solid ${m.cardBorder}`,
      fontFamily: "'Syne', sans-serif", fontSize: 13,
      fontWeight: 700, color: m.text,
      position: "sticky", top: 0, background: m.sidebar, zIndex: 1,
    },
    projectItem: (active) => ({
      padding: "14px 20px", cursor: "pointer",
      borderBottom: `1px solid ${m.cardBorder}`,
      background: active ? a.glow : "transparent",
      borderLeft: active ? `3px solid ${a.color}` : "3px solid transparent",
      transition: "all 0.2s",
    }),
    projectItemName: (active) => ({
      fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? m.text : m.textMuted,
    }),
    projectItemSub: { fontSize: 11, color: m.textMuted, marginTop: 3 },
    chatArea: {
      flex: 1, display: "flex", flexDirection: "column",
      minWidth: 0, height: "100%", overflow: "hidden",
    },
    chatHeader: {
      padding: "16px 24px", borderBottom: `1px solid ${m.cardBorder}`,
      background: m.topbar, display: "flex",
      alignItems: "center", gap: 12, flexShrink: 0,
    },
    chatHeaderDot: {
      width: 8, height: 8, borderRadius: "50%",
      background: a.color, boxShadow: `0 0 10px ${a.color}`,
    },
    chatHeaderTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 15,
      fontWeight: 700, color: m.text,
    },
    chatHeaderCaption: {
      fontSize: 11,
      color: m.textMuted,
      marginTop: 4,
      lineHeight: 1.3,
    },
    chatHeaderSub: { fontSize: 12, color: m.textMuted, marginLeft: "auto", flexShrink: 0 },
    messages: {
      flex: 1, padding: "20px 24px", overflowY: "auto",
      display: "flex", flexDirection: "column", gap: 14,
    },
    msgRow: (me) => ({
      display: "flex", justifyContent: me ? "flex-end" : "flex-start",
      alignItems: "flex-end", gap: 8,
    }),
    msgAvatar: {
      width: 30, height: 30, borderRadius: "50%",
      background: a.color + "25", border: `1px solid ${a.color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: a.color, flexShrink: 0,
    },
    msgBubble: (me) => ({
      maxWidth: "65%", padding: "10px 14px",
      borderRadius: me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      background: me ? a.color : m.card,
      color: me ? "#fff" : m.text, fontSize: 13, lineHeight: 1.5,
      border: me ? "none" : `1px solid ${m.cardBorder}`,
      boxShadow: me ? `0 4px 16px ${a.color}40` : m.shadow,
    }),
    msgName: { fontSize: 10, color: m.textMuted, marginBottom: 4, fontWeight: 600 },
    msgTime: { fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" },
    inputArea: {
      padding: "16px 24px", borderTop: `1px solid ${m.cardBorder}`,
      background: m.topbar, display: "flex", gap: 10,
      alignItems: "flex-end", flexShrink: 0,
    },
    input: {
      flex: 1, padding: "10px 16px", borderRadius: 12,
      border: `1px solid ${m.cardBorder}`, background: m.bg,
      color: m.text, fontSize: 13, outline: "none",
      fontFamily: "'DM Sans', sans-serif", resize: "none",
      maxHeight: 100, minHeight: 42, transition: "all 0.2s",
    },
    sendBtn: {
      padding: "10px 20px", borderRadius: 12, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer",
      boxShadow: `0 0 16px ${a.color}60`, transition: "all 0.2s",
      whiteSpace: "nowrap",
    },
  };

  return (
    <Layout>
      <div style={s.wrapper}>
        <div style={s.projectList}>
          <div style={s.projectListHeader}>💬 Project chats</div>
          {projects.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: m.textMuted }}>
              No projects yet.{" "}
              <span style={{ color: a.color, cursor: "pointer" }} onClick={() => navigate("/projects")}>
                Create one
              </span>
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p._id}
                style={s.projectItem(selectedProject?._id === p._id)}
                onClick={() => selectProject(p)}
                onMouseEnter={(e) => {
                  if (selectedProject?._id !== p._id)
                    e.currentTarget.style.background = m.cardBorder;
                }}
                onMouseLeave={(e) => {
                  if (selectedProject?._id !== p._id)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={s.projectItemName(selectedProject?._id === p._id)}>{p.name}</div>
                <div style={s.projectItemSub}>{p.status}</div>
              </div>
            ))
          )}
        </div>

        <div style={s.chatArea}>
          {!selectedProject ? (
            <EmptyState
              icon="📨"
              title="Select a project"
              subtitle="Each thread is tied to a project, not a contact name"
            />
          ) : (
            <>
              <div style={s.chatHeader}>
                <div style={s.chatHeaderDot}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.chatHeaderTitle}>{selectedProject.name}</div>
                  <div style={s.chatHeaderCaption}>
                    Project message thread (your notes for this job)
                  </div>
                </div>
                <div style={s.chatHeaderSub}>{messages.length} messages</div>
              </div>
              <div style={s.messages}>
                {loading ? (
                  <div style={{ textAlign: "center", color: m.textMuted, fontSize: 13 }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState icon="👋" title="No messages yet" subtitle="Be the first to say something!" />
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={msg._id != null ? String(msg._id) : `msg-${i}`}
                      style={s.msgRow(isMe(msg))}
                    >
                      {!isMe(msg) && (
                        <div style={s.msgAvatar}>{msg.senderName?.[0]?.toUpperCase()}</div>
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
                  onFocus={(e) => e.currentTarget.style.borderColor = a.color}
                  onBlur={(e) => e.currentTarget.style.borderColor = m.cardBorder}
                  rows={1}
                />
                <button
                  style={s.sendBtn}
                  onClick={sendMessage}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  Send →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;