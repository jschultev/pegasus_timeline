// Shared interaction components: assignee picker, task row, etc.
// Used across all 3 variants.

const { useState, useRef, useEffect } = React;

// Avatar / initials chip
function PersonChip({ person, size = 22, ring = false, onClick, title }) {
  if (!person) return null;
  return (
    <span
      onClick={onClick}
      title={title || person.name}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%",
        background: person.color, color: "#fff",
        fontSize: size * 0.42, fontWeight: 700, fontFamily: "ui-sans-serif, system-ui, sans-serif",
        letterSpacing: 0, flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3px ${person.color}` : "0 1px 2px rgba(0,0,0,0.15)",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {person.id}
    </span>
  );
}

// Assignee picker popover
function AssigneePicker({ assignees, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (id) => {
    const next = assignees.includes(id) ? assignees.filter(x => x !== id) : [...assignees, id];
    onChange(next);
  };

  const assigned = TEAM.filter(p => assignees.includes(p.id));

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {assigned.length === 0 ? (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              border: "1px dashed #b8b8b0", background: "transparent",
              color: "#888", borderRadius: 999, padding: "2px 8px",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>+ assign</button>
        ) : (
          <span onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", cursor: "pointer" }}>
            {assigned.slice(0, 4).map((p, i) => (
              <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                <PersonChip person={p} size={20} ring />
              </span>
            ))}
            {assigned.length > 4 && (
              <span style={{
                marginLeft: -6, width: 20, height: 20, borderRadius: "50%",
                background: "#444", color: "#fff", fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 2px #fff",
              }}>+{assigned.length - 4}</span>
            )}
          </span>
        )}
      </span>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#fff", border: "1px solid #d9d6cc", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          padding: 6, minWidth: 180,
        }}>
          {TEAM.map(p => {
            const on = assignees.includes(p.id);
            return (
              <div key={p.id} onClick={() => toggle(p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                  borderRadius: 6, cursor: "pointer",
                  background: on ? "#f3efe6" : "transparent",
                }}>
                <PersonChip person={p} size={22} />
                <span style={{ fontSize: 13, flex: 1, color: "#222" }}>{p.name}</span>
                {on && <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}

// Comment popover
function CommentPopover({ value, onChange, accent = "#666" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const has = value && value.trim().length > 0;
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={() => setOpen(o => !o)}
        title={has ? value : "Add note"}
        style={{
          border: "none", background: has ? accent + "22" : "transparent",
          color: has ? accent : "#aaa", cursor: "pointer", padding: "2px 6px",
          borderRadius: 6, fontSize: 13, lineHeight: 1, fontFamily: "inherit",
        }}>
        {has ? "📝" : "💬"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
          background: "#fff", border: "1px solid #d9d6cc", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8, width: 240,
        }}>
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Note…"
            autoFocus
            style={{
              width: "100%", minHeight: 70, border: "1px solid #e5e2d8",
              borderRadius: 6, padding: 6, fontSize: 12, fontFamily: "inherit",
              resize: "vertical", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}
    </span>
  );
}

// Due date editor (drag = adjust by days, click to type)
function DueDateChip({ value, onChange, accent = "#3B7BC9" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const startDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startDate = parseDate(value);
    let lastDelta = 0;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const days = Math.round(dx / 6); // 6px per day
      if (days !== lastDelta) {
        lastDelta = days;
        const nd = new Date(startDate);
        nd.setDate(nd.getDate() + days);
        const iso = nd.toISOString().slice(0, 10);
        onChange(iso);
      }
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  if (editing) {
    return (
      <input type="date" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft) onChange(draft); }}
        onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); if (draft) onChange(draft); } }}
        autoFocus
        style={{ fontSize: 11, fontFamily: "inherit", border: `1px solid ${accent}`, borderRadius: 4, padding: "1px 4px" }}
      />
    );
  }
  return (
    <span
      onMouseDown={startDrag}
      onDoubleClick={() => setEditing(true)}
      title="Drag horizontal to shift days · double-click to pick"
      style={{
        fontSize: 11, color: accent, fontWeight: 600,
        cursor: "ew-resize", padding: "1px 6px", borderRadius: 4,
        background: accent + "14", userSelect: "none",
        fontFamily: "ui-monospace, monospace",
      }}>
      {fmtDate(value)}
    </span>
  );
}

Object.assign(window, { PersonChip, AssigneePicker, CommentPopover, DueDateChip });
