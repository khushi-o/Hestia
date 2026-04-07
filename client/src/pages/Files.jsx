import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";

const Files = () => {
  const accent = useAuthStore((s) => s.accent);
  const mode   = useAuthStore((s) => s.mode);
  const user   = useAuthStore((s) => s.user);
  const isAgency = user?.role !== "client";
  const navigate = useNavigate();
  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [files, setFiles]                     = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const fileInputRef = useRef(null);

  const a = accents[accent];
  const m = modes[mode];

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err) { console.error(err); }
  };

  const selectProject = async (project) => {
    setSelectedProject(project);
    setLoading(true);
    try {
      const res = await API.get(`/files/${project._id}`);
      setFiles(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProject) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await API.post(`/files/${selectedProject._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles([res.data, ...files]);
    } catch {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId) => {
    if (!isAgency) return;
    if (!window.confirm("Delete this file?")) return;
    try {
      await API.delete(`/files/${fileId}`);
      setFiles(files.filter((f) => f._id !== fileId));
    } catch {
      alert("Failed to delete file");
    }
  };

  const handleDownload = async (fileId) => {
    const meta = files.find((f) => f._id === fileId);
    try {
      const res = await API.get(`/files/download/${fileId}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta?.originalName || "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed — try signing in again or check your connection.");
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileIcon = (mimetype) => {
    if (mimetype?.includes("image"))   return "🖼️";
    if (mimetype?.includes("pdf"))     return "📄";
    if (mimetype?.includes("word") || mimetype?.includes("document")) return "📝";
    if (mimetype?.includes("sheet") || mimetype?.includes("excel"))   return "📊";
    if (mimetype?.includes("zip") || mimetype?.includes("rar"))       return "🗜️";
    if (mimetype?.includes("video"))   return "🎥";
    if (mimetype?.includes("audio"))   return "🎵";
    return "📁";
  };

  const s = {
    wrapper: {
      display: "flex", flex: 1, minWidth: 0,
      overflow: "hidden", height: "100%",
      position: "relative",
    },
    projectList: {
      width: 240, borderRight: `1px solid ${m.cardBorder}`,
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
    fileArea: {
      flex: 1, display: "flex", flexDirection: "column",
      minWidth: 0, height: "100%", overflow: "hidden",
    },
    fileHeader: {
      padding: "14px 24px", borderBottom: `1px solid ${m.cardBorder}`,
      background: m.topbar, display: "flex",
      alignItems: "center", justifyContent: "space-between", flexShrink: 0,
    },
    fileHeaderTitle: {
      fontFamily: "'Syne', sans-serif", fontSize: 14,
      fontWeight: 700, color: m.text,
    },
    uploadBtn: {
      padding: "8px 16px", borderRadius: 8, border: "none",
      background: a.color, color: "#fff", fontSize: 13,
      fontWeight: 600, cursor: "pointer",
      boxShadow: `0 0 12px ${a.color}60`, transition: "all 0.2s",
    },
    fileGrid: {
      padding: "24px", display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 14, alignContent: "start", flex: 1, overflowY: "auto",
    },
    fileCard: {
      background: m.card, borderRadius: 12,
      border: `1px solid ${m.cardBorder}`, padding: 16,
      boxShadow: m.shadow, position: "relative", overflow: "hidden",
      transition: "all 0.2s ease",
    },
    fileCardAccent: {
      position: "absolute", top: 0, left: 0, right: 0,
      height: 2, background: a.color, opacity: 0.6,
    },
    fileIcon: { fontSize: 32, marginBottom: 10, display: "block" },
    fileName: {
      fontSize: 12, fontWeight: 600, color: m.text,
      marginBottom: 4, wordBreak: "break-all", lineHeight: 1.4,
    },
    fileMeta: {
      fontSize: 10, color: m.textMuted,
      marginBottom: 12, lineHeight: 1.5,
    },
    fileActions: { display: "flex", gap: 6 },
    fileBtn: (color) => ({
      flex: 1, padding: "6px 8px", borderRadius: 6, border: "none",
      background: color + "20", color: color, fontSize: 10,
      fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
    }),
    dropZone: {
      margin: 24, border: `2px dashed ${m.cardBorder}`,
      borderRadius: 14, padding: "60px 20px", textAlign: "center",
      color: m.textMuted, cursor: "pointer", transition: "all 0.2s",
    },
  };

  return (
    <Layout>
      <div style={s.wrapper}>
        <div style={s.projectList}>
          <div style={s.projectListHeader}>📎 Projects</div>
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

        <div style={s.fileArea}>
          {!selectedProject ? (
            <EmptyState
              icon="🗃️"
              title="Select a project"
              subtitle="Choose a project from the left to view and upload files"
            />
          ) : (
            <>
              <div style={s.fileHeader}>
                <div style={s.fileHeaderTitle}>
                  {selectedProject.name} — {files.length} file{files.length !== 1 ? "s" : ""}
                </div>
                <button
                  style={s.uploadBtn}
                  onClick={() => fileInputRef.current.click()}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {uploading ? "Uploading..." : "⬆️ Upload File"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleUpload}
                />
              </div>

              {loading ? (
                <EmptyState icon="⏳" title="Loading files..." subtitle="" />
              ) : files.length === 0 ? (
                <div
                  style={s.dropZone}
                  onClick={() => fileInputRef.current.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = a.color;
                    e.currentTarget.style.background = a.glow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = m.cardBorder;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: m.text, marginBottom: 8 }}>
                    No files yet
                  </div>
                  <div style={{ fontSize: 12 }}>Click to upload your first file</div>
                </div>
              ) : (
                <div style={s.fileGrid}>
                  {files.map((file) => (
                    <div
                      key={file._id}
                      style={s.fileCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = `0 12px 32px ${a.color}20`;
                        e.currentTarget.style.borderColor = `${a.color}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = m.shadow;
                        e.currentTarget.style.borderColor = m.cardBorder;
                      }}
                    >
                      <div style={s.fileCardAccent}></div>
                      <span style={s.fileIcon}>{fileIcon(file.mimetype)}</span>
                      <div style={s.fileName}>{file.originalName}</div>
                      <div style={s.fileMeta}>
                        {formatSize(file.size)}<br />
                        {file.uploadedByName}<br />
                        {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                      <div style={s.fileActions}>
                        <button
                          style={s.fileBtn(a.color)}
                          onClick={() => handleDownload(file._id)}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          ⬇️ Download
                        </button>
                        {isAgency ? (
                          <button
                            style={s.fileBtn("#f87171")}
                            onClick={() => handleDelete(file._id)}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          >
                            🗑
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Files;