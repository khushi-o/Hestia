import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Trash2, MessageSquare } from "lucide-react";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { getSocketUrl } from "../config/env.js";

function dedupeMessagesById(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const id = m._id == null ? null : String(m._id);
    if (!id) {
      out.push(m);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(m);
  }
  return out;
}

function messageMongoId(msg) {
  if (!msg || msg._id == null) return "";
  const id = msg._id;
  if (typeof id === "object" && typeof id.toHexString === "function") {
    return id.toHexString();
  }
  return String(id);
}

function looksLikeHtmlOrServerDump(text) {
  const t = text.trim();
  return (
    t.includes("<!DOCTYPE") ||
    t.includes("<html") ||
    t.includes("Cannot DELETE") ||
    t.includes("Cannot GET") ||
    t.includes("<pre>")
  );
}

/** End-user copy only — details go to the console for developers. */
function formatDeleteError(err) {
  if (import.meta.env.DEV) {
    console.warn("[messages] delete failed", err.response?.status, err.response?.data ?? err.message);
  }
  const st = err.response?.status;
  const d = err.response?.data;

  if (typeof d === "string" && d.trim() && !looksLikeHtmlOrServerDump(d)) {
    if (st === 403) return "You can't remove this message.";
    if (st === 404) return "This message isn't available anymore. Try refreshing the list.";
    const short = d.length > 120 ? `${d.slice(0, 117)}…` : d;
    return short;
  }
  if (d && typeof d === "object" && typeof d.message === "string" && d.message.trim()) {
    const msg = d.message.trim();
    if (looksLikeHtmlOrServerDump(msg)) {
      return "We couldn't remove that message right now. Please try again in a moment.";
    }
    if (msg.length > 120) return `${msg.slice(0, 117)}…`;
    if (st === 403) return "You can't remove this message.";
    if (st === 404) return "This message isn't available anymore. Try refreshing the list.";
    return msg;
  }
  if (typeof d === "string" && d.trim()) {
    return "We couldn't remove that message right now. Please try again in a moment.";
  }

  if (st === 401) return "Your session expired. Please sign in again.";
  if (st === 403) return "You can't remove this message.";
  if (st === 404) return "This message isn't available anymore. Try refreshing the list.";
  if (err.message === "Network Error") {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "We couldn't remove that message right now. Please try again in a moment.";
}

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
  const [deletingId, setDeletingId]           = useState(null);
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState(null);
  const [deleteNotice, setDeleteNotice]     = useState("");
  const bottomRef = useRef(null);
  const sendingRef = useRef(false);
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
        const id = messageMongoId(msg) || null;
        if (id && prev.some((m) => messageMongoId(m) === id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });
    const onDeleted = (payload) => {
      const sp = selectedProjectRef.current;
      if (!sp || String(payload.projectId) !== String(sp._id)) return;
      const mid = String(payload.messageId);
      setMessages((prev) => prev.filter((m) => messageMongoId(m) !== mid));
    };
    socket.on("message_deleted", onDeleted);
    return () => {
      socket.off("connect", joinSelectedRoom);
      socket.off("receive_message");
      socket.off("message_deleted", onDeleted);
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
    /* Socket.io client has no leave(); server drops the previous project room on join_project. */
    setSelectedProject(project);
    setLoading(true);
    if (sock) {
      sock.emit("join_project", project._id, (res) => {
        if (res?.ok) joinedRoomRef.current = project._id;
      });
    }
    try {
      const res = await API.get(`/messages/${project._id}`);
      setMessages(dedupeMessagesById(res.data));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedProject || sendingRef.current) return;
    const body = text.trim();
    sendingRef.current = true;
    try {
      await API.post(`/messages/${selectedProject._id}`, { text: body });
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      sendingRef.current = false;
    }
  };

  const runConfirmedDelete = async () => {
    const msg = confirmDeleteMsg;
    if (!msg || !selectedProject) {
      setConfirmDeleteMsg(null);
      return;
    }
    const id = messageMongoId(msg);
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
      setConfirmDeleteMsg(null);
      setDeleteNotice("Something went wrong. Refresh the page and try again.");
      return;
    }
    const projectId = String(selectedProject._id);
    setDeletingId(id);
    setDeleteNotice("");
    try {
      await API.delete(`/messages/${projectId}/${id}`);
      setMessages((prev) => prev.filter((m) => messageMongoId(m) !== id));
      setConfirmDeleteMsg(null);
    } catch (err) {
      setConfirmDeleteMsg(null);
      setDeleteNotice(formatDeleteError(err));
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const userId = user?._id ?? user?.id;
  const isMe = (msg) =>
    (msg.sender != null &&
      userId != null &&
      String(msg.sender) === String(userId)) ||
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
    chatHeaderIcon: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      background: `${a.color}18`,
      border: `1px solid ${a.color}35`,
      color: a.color,
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
    deleteBanner: {
      padding: "10px 24px",
      fontSize: 13,
      fontWeight: 500,
      color: m.text,
      background: `${a.color}12`,
      borderBottom: `1px solid ${m.cardBorder}`,
      borderLeft: `3px solid ${a.color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    deleteBannerDismiss: {
      flexShrink: 0,
      border: "none",
      background: "transparent",
      color: m.textMuted,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: 6,
      fontFamily: "'DM Sans', sans-serif",
    },
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
    msgMetaRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    msgDeleteBtn: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: 8,
      border: `1px solid ${m.cardBorder}`,
      background: m.card,
      color: m.textMuted,
      cursor: "pointer",
      padding: 0,
      transition: "all 0.15s",
    },
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
                <div style={s.chatHeaderIcon} aria-hidden>
                  <MessageSquare size={18} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.chatHeaderTitle}>{selectedProject.name}</div>
                  <div style={s.chatHeaderCaption}>
                    Project message thread (your notes for this job)
                  </div>
                </div>
                <div style={s.chatHeaderSub}>{messages.length} messages</div>
              </div>
              {deleteNotice ? (
                <div role="status" style={s.deleteBanner}>
                  <span>{deleteNotice}</span>
                  <button
                    type="button"
                    style={s.deleteBannerDismiss}
                    onClick={() => setDeleteNotice("")}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
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
                      key={messageMongoId(msg) || `msg-${i}`}
                      style={s.msgRow(isMe(msg))}
                    >
                      {!isMe(msg) && (
                        <div style={s.msgAvatar}>{msg.senderName?.[0]?.toUpperCase()}</div>
                      )}
                      <div>
                        {!isMe(msg) && <div style={s.msgName}>{msg.senderName}</div>}
                        <div style={s.msgMetaRow}>
                          {isMe(msg) && messageMongoId(msg) && (
                            <button
                              type="button"
                              title="Delete message"
                              aria-label="Delete message"
                              disabled={deletingId === messageMongoId(msg)}
                              style={{
                                ...s.msgDeleteBtn,
                                opacity: deletingId === messageMongoId(msg) ? 0.5 : 1,
                              }}
                              onClick={() => {
                                setDeleteNotice("");
                                setConfirmDeleteMsg(msg);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#f87171";
                                e.currentTarget.style.borderColor = "rgba(248,113,113,0.35)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = m.textMuted;
                                e.currentTarget.style.borderColor = m.cardBorder;
                              }}
                            >
                              <Trash2 size={14} strokeWidth={2} aria-hidden />
                            </button>
                          )}
                          <div style={s.msgBubble(isMe(msg))}>
                            {msg.text}
                            <div style={s.msgTime}>{formatTime(msg.createdAt)}</div>
                          </div>
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
      <ConfirmDialog
        open={!!confirmDeleteMsg}
        title="Delete message?"
        description="This will remove it from your project thread permanently."
        confirmLabel={deletingId ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        danger
        busy={!!deletingId}
        onClose={() => !deletingId && setConfirmDeleteMsg(null)}
        onConfirm={runConfirmedDelete}
      />
    </Layout>
  );
};

export default Messages;