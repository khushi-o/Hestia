import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

const emptyResults = () => ({
  clients: [],
  projects: [],
  invoices: [],
  nlSummary: "",
  nl: false,
});

function shouldUseNlHeuristic(query) {
  const t = query.trim();
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 3 || t.length >= 22;
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(emptyResults);
  const [smartNl, setSmartNl] = useState(() => {
    try {
      const v = localStorage.getItem("hestia-smart-search");
      if (v === null) return true;
      return v === "1";
    } catch {
      return true;
    }
  });
  const timer = useRef(null);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const accent = useAuthStore((s) => s.accent);
  const mode = useAuthStore((s) => s.mode);
  const a = accents[accent] || accents.earthy;
  const m = modes[mode] || modes.earthy;

  const runSearch = useCallback(
    async (query) => {
      const t = query.trim();
      if (t.length < 2) {
        setData(emptyResults());
        return;
      }
      setLoading(true);
      try {
        const params = { q: t };
        if (smartNl && shouldUseNlHeuristic(t)) {
          params.nl = "1";
        }
        const res = await API.get("/search", { params });
        setData({
          clients: res.data.clients || [],
          projects: res.data.projects || [],
          invoices: res.data.invoices || [],
          nlSummary: res.data.nlSummary || "",
          nl: Boolean(res.data.nl),
        });
      } catch {
        setData(emptyResults());
      } finally {
        setLoading(false);
      }
    },
    [smartNl]
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(q), 280);
    return () => clearTimeout(timer.current);
  }, [q, runSearch]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hestia-open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hestia-open-search", onOpen);
    };
  }, []);

  const close = () => {
    setOpen(false);
    setQ("");
    setData(emptyResults());
  };

  const toggleSmartNl = () => {
    setSmartNl((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hestia-smart-search", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const go = (path) => {
    navigate(path);
    close();
  };

  if (!open) return null;

  const sections = [
    ["Clients", data.clients],
    ["Projects", data.projects],
    ["Invoices", data.invoices],
  ].filter(([, items]) => items.length > 0);

  const empty =
    !loading &&
    q.trim().length >= 2 &&
    sections.length === 0 &&
    !data.nlSummary;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onClick={close}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: m.card,
          borderRadius: 14,
          border: `1px solid ${m.cardBorder}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${m.cardBorder}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients, projects, invoices…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: m.text,
              fontSize: 15,
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            type="button"
            onClick={toggleSmartNl}
            title={
              smartNl
                ? "Smart search on (longer questions use AI when configured)"
                : "Smart search off (keyword only)"
            }
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${m.cardBorder}`,
              background: smartNl ? a.glow : "transparent",
              color: m.textMuted,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Smart
          </button>
          <kbd
            style={{
              fontSize: 10,
              color: m.textMuted,
              padding: "2px 6px",
              borderRadius: 4,
              border: `1px solid ${m.cardBorder}`,
            }}
          >
            Esc
          </kbd>
        </div>
        {data.nlSummary ? (
          <div
            style={{
              padding: "8px 16px 10px",
              fontSize: 12,
              color: m.textMuted,
              borderBottom: `1px solid ${m.cardBorder}`,
              lineHeight: 1.45,
            }}
          >
            {data.nl ? "Interpreted: " : ""}
            {data.nlSummary}
          </div>
        ) : null}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
          {loading && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: m.textMuted,
                fontSize: 13,
              }}
            >
              Searching…
            </div>
          )}
          {empty && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: m.textMuted,
                fontSize: 13,
              }}
            >
              No results
            </div>
          )}
          {!loading &&
            q.trim().length >= 2 &&
            sections.length === 0 &&
            data.nlSummary && (
              <div
                style={{
                  padding: "16px 20px",
                  textAlign: "center",
                  color: m.textMuted,
                  fontSize: 13,
                }}
              >
                No rows matched that interpretation. Try different words or turn
                off Smart for keyword search.
              </div>
            )}
          {q.trim().length < 2 && !loading && (
            <div
              style={{
                padding: "16px 20px",
                color: m.textMuted,
                fontSize: 12,
              }}
            >
              Type at least 2 characters
            </div>
          )}
          {sections.map(([label, items]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: m.textMuted,
                  padding: "8px 16px 6px",
                }}
              >
                {label}
              </div>
              {items.map((row) => (
                <button
                  key={`${label}-${row.id}`}
                  type="button"
                  onClick={() => go(row.path)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "10px 16px",
                    display: "block",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = a.glow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: m.text,
                    }}
                  >
                    {row.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: m.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {row.subtitle}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
