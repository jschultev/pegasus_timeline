// Variant 2: Clean Engineering Timeline
// Modern, technical aesthetic. Monospace details, calm palette, precise grid.
// Top: horizontal axis with milestone diamonds. Click → right-side detail drawer.

const { useState: useStateV2, useRef: useRefV2, useEffect: useEffectV2, useMemo: useMemoV2 } = React;

function CleanTimeline() {
  const [store, updateStore] = useStore();
  const [selectedId, setSelectedId] = useStateV2("milestone13");
  const [zoom, setZoom] = useStateV2(1);
  const [pan, setPan] = useStateV2(0);

  const range = useMemoV2(() => {
    const dates = MILESTONES.map(m => parseDate(m.date));
    const min = new Date(Math.min(...dates)); min.setDate(min.getDate() - 4);
    const max = new Date(Math.max(...dates)); max.setDate(max.getDate() + 3);
    return { min, max };
  }, []);

  const baseW = 1100;
  const totalW = baseW * zoom;
  const dayToX = (iso) => {
    const t = (parseDate(iso) - range.min) / (range.max - range.min);
    return 50 + t * (totalW - 100);
  };

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.6, Math.min(4, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      setPan(p => p - e.deltaX);
    }
  };

  const onMouseDown = (e) => {
    if (e.target.closest("[data-milestone]")) return;
    const startX = e.clientX, startPan = pan;
    const move = (ev) => setPan(startPan + (ev.clientX - startX));
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const selected = MILESTONES.find(m => m.id === selectedId);

  // Generate week ticks
  const weekTicks = useMemoV2(() => {
    const ticks = [];
    const d = new Date(range.min);
    // Snap to next monday
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d <= range.max) {
      ticks.push(new Date(d).toISOString().slice(0, 10));
      d.setDate(d.getDate() + 7);
    }
    return ticks;
  }, [range]);

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0e1014", color: "#e8e6df",
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 18,
        padding: "14px 24px", borderBottom: "1px solid #232730",
        background: "#13161c",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#6c7280", fontFamily: "ui-monospace, monospace", letterSpacing: 1.5 }}>PROJECT</span>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>PEGASUS</span>
          <span style={{ fontSize: 13, color: "#6c7280" }}>· Aerospace Studentprojekt · 2026</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#6c7280", fontFamily: "ui-monospace, monospace" }}>
          <span>TODAY {fmtDate(TODAY)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>ZOOM {zoom.toFixed(2)}x</span>
          <button onClick={() => { setZoom(1); setPan(0); }} style={cleanBtn}>⊙</button>
          <button onClick={() => setZoom(z => Math.max(0.6, z / 1.2))} style={cleanBtn}>−</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} style={cleanBtn}>+</button>
        </div>
      </div>

      {/* Timeline */}
      <div onWheel={onWheel} onMouseDown={onMouseDown}
        style={{ flex: "0 0 220px", position: "relative", overflow: "hidden", cursor: "grab", borderBottom: "1px solid #232730" }}>
        <svg width={totalW} height={220} style={{ position: "absolute", left: pan, top: 0 }}>
          {/* Week grid */}
          {weekTicks.map((iso, i) => (
            <g key={iso} transform={`translate(${dayToX(iso)}, 0)`}>
              <line x1={0} y1={30} x2={0} y2={210} stroke="#1d2028" strokeWidth={1} />
              <text x={4} y={42} fontSize={10} fill="#4d5160" fontFamily="ui-monospace, monospace">
                {fmtDate(iso).toUpperCase()}
              </text>
            </g>
          ))}

          {/* Spine */}
          <line x1={dayToX(range.min.toISOString().slice(0,10))} y1={120}
                x2={dayToX(range.max.toISOString().slice(0,10))} y2={120}
                stroke="#3d424f" strokeWidth={1.5} />

          {/* Today */}
          <g transform={`translate(${dayToX(TODAY)}, 0)`}>
            <line x1={0} y1={50} x2={0} y2={200} stroke="#5fc8a8" strokeWidth={1} strokeDasharray="2 4" />
            <rect x={-22} y={185} width={44} height={16} rx={2} fill="#5fc8a8" />
            <text x={0} y={196} fontSize={9} fill="#0e1014" textAnchor="middle"
              fontFamily="ui-monospace, monospace" fontWeight={700} letterSpacing={1}>TODAY</text>
          </g>

          {/* Milestones */}
          {MILESTONES.map((m) => {
            const x = dayToX(m.date);
            const isSel = m.id === selectedId;
            const tasks = getMilestoneTasks(store, m);
            const done = tasks.filter(t => getTaskState(store, t).done).length;
            const pct = tasks.length ? done / tasks.length : 0;
            const accent = m.tone === "warn" ? "#e8634a" : "#c0c5d1";
            return (
              <g key={m.id} data-milestone style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(m.id)}>
                {/* Vertical drop */}
                <line x1={x} y1={120} x2={x} y2={70} stroke={isSel ? accent : "#3d424f"} strokeWidth={1} strokeDasharray={isSel ? "0" : "2 3"} />
                {/* Diamond */}
                <g transform={`translate(${x}, 120)`}>
                  <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)"
                    fill={isSel ? accent : "#13161c"}
                    stroke={accent} strokeWidth={2} />
                </g>
                {/* Label card */}
                <g transform={`translate(${x}, 50)`}>
                  <rect x={-58} y={0} width={116} height={20} rx={3}
                    fill={isSel ? accent : "#1a1d24"}
                    stroke={isSel ? accent : "#2a2e38"} strokeWidth={1} />
                  <text x={0} y={13.5} fontSize={10}
                    fill={isSel ? "#0e1014" : "#e8e6df"}
                    textAnchor="middle" fontWeight={600}
                    fontFamily="ui-monospace, monospace" letterSpacing={1}>
                    {m.short}
                  </text>
                </g>
                {/* Progress bar below */}
                <g transform={`translate(${x}, 140)`}>
                  <text x={0} y={12} fontSize={11} fill="#a8aab3" textAnchor="middle"
                    fontFamily="ui-monospace, monospace">
                    {fmtDate(m.date)}
                  </text>
                  <rect x={-30} y={20} width={60} height={4} rx={2} fill="#1d2028" />
                  <rect x={-30} y={20} width={60 * pct} height={4} rx={2} fill={accent} />
                  <text x={0} y={42} fontSize={10} fill="#6c7280" textAnchor="middle"
                    fontFamily="ui-monospace, monospace">
                    {done}/{tasks.length}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom: detail panel + team */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {selected && (
          <CleanDetailPanel milestone={selected} store={store} updateStore={updateStore} />
        )}
        <CleanTeamPanel />
      </div>
    </div>
  );
}

const cleanBtn = {
  background: "#1a1d24", color: "#a8aab3", border: "1px solid #2a2e38",
  width: 24, height: 22, borderRadius: 4, cursor: "pointer",
  fontFamily: "ui-monospace, monospace", fontSize: 12,
};

function CleanDetailPanel({ milestone, store, updateStore }) {
  const tasks = getMilestoneTasks(store, milestone);
  const [newLabel, setNewLabel] = useStateV2("");
  const accent = milestone.tone === "warn" ? "#e8634a" : "#c0c5d1";

  const tog = (id) => updateStore(s => { s.tasks[id] = s.tasks[id] || {}; s.tasks[id].done = !s.tasks[id].done; return s; });
  const setA = (id, a) => updateStore(s => { s.tasks[id] = { ...(s.tasks[id]||{}), assignees: a }; return s; });
  const setC = (id, c) => updateStore(s => { s.tasks[id] = { ...(s.tasks[id]||{}), comment: c }; return s; });
  const setD = (id, d) => updateStore(s => { s.tasks[id] = { ...(s.tasks[id]||{}), due: d }; return s; });
  const add = () => {
    if (!newLabel.trim()) return;
    updateStore(s => {
      s.custom[milestone.id] = s.custom[milestone.id] || [];
      s.custom[milestone.id].push({ id: `cust_${Date.now()}`, label: newLabel.trim(), due: milestone.date, assignees: [] });
      return s;
    });
    setNewLabel("");
  };

  return (
    <div style={{ flex: 1, padding: "20px 28px", overflow: "auto", borderRight: "1px solid #232730" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#6c7280", letterSpacing: 1.5 }}>MILESTONE</span>
        <span style={{ width: 8, height: 8, background: accent, transform: "rotate(45deg)", display: "inline-block" }}></span>
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>{milestone.title}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#a8aab3" }}>
          {fmtDateLong(milestone.date)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#6c7280", marginBottom: 18, fontFamily: "ui-monospace, monospace" }}>
        T{daysFromToday(milestone.date) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(milestone.date))} DAYS
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tasks.map(task => {
          const st = getTaskState(store, task);
          return (
            <div key={task.id} style={{
              display: "grid", gridTemplateColumns: "20px 1fr auto auto auto", gap: 12, alignItems: "center",
              padding: "9px 10px", background: st.done ? "#13161c" : "#161922", borderRadius: 5,
              border: "1px solid #1d2028",
            }}>
              <input type="checkbox" checked={st.done} onChange={() => tog(task.id)}
                style={{ width: 16, height: 16, accentColor: accent, cursor: "pointer" }} />
              <div style={{ fontSize: 13, color: st.done ? "#5d6170" : "#e8e6df",
                textDecoration: st.done ? "line-through" : "none" }}>{st.label}</div>
              <DueDateChip value={st.due} onChange={(d) => setD(task.id, d)} accent={accent} />
              <AssigneePicker assignees={st.assignees} onChange={(a) => setA(task.id, a)} />
              <CommentPopover value={st.comment} onChange={(c) => setC(task.id, c)} accent={accent} />
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: "1px dashed #2a2e38", borderRadius: 5, marginTop: 4 }}>
          <span style={{ color: "#5d6170", fontSize: 14 }}>＋</span>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="add task…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#a8aab3", fontSize: 13, fontFamily: "inherit" }} />
        </div>
      </div>
    </div>
  );
}

function CleanTeamPanel() {
  return (
    <div style={{ width: 200, padding: "20px 22px", overflow: "auto", background: "#0a0c10" }}>
      <div style={{ fontSize: 10, color: "#6c7280", letterSpacing: 1.5, fontFamily: "ui-monospace, monospace", marginBottom: 12 }}>TEAM ({TEAM.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TEAM.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PersonChip person={p} size={24} />
            <span style={{ fontSize: 13, color: "#c0c5d1" }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CleanTimeline });
