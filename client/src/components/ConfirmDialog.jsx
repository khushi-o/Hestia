import { useEffect } from "react";
import { createPortal } from "react-dom";
import useAuthStore from "../store/authStore";
import { accents, modes } from "../theme";

/**
 * In-app confirm (replaces window.confirm) so messaging matches theme and feels native to the app.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  const accent = useAuthStore((s) => s.accent);
  const mode = useAuthStore((s) => s.mode);
  const a = accents[accent] || accents.earthy;
  const m = modes[mode] || modes.earthy;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const confirmBg = danger ? "#dc2626" : a.color;
  const confirmShadow = danger ? "0 4px 20px rgba(220,38,38,0.35)" : `0 4px 20px ${a.color}45`;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={() => !busy && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        style={{
          width: "100%",
          maxWidth: 400,
          background: m.card,
          color: m.text,
          borderRadius: 16,
          border: `1px solid ${m.cardBorder}`,
          boxShadow: m.shadow,
          padding: 24,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            margin: "0 0 8px 0",
            fontFamily: "'Syne', sans-serif",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          style={{
            margin: "0 0 22px 0",
            fontSize: 14,
            lineHeight: 1.5,
            color: m.textMuted,
          }}
        >
          {description}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={busy}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${m.cardBorder}`,
              background: m.bg,
              color: m.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: confirmBg,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: busy ? "none" : confirmShadow,
              opacity: busy ? 0.7 : 1,
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
