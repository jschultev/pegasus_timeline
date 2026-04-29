// Variant 3: Hybrid – horizontal timeline + Gantt-style task bars below
// Top spine with milestone markers (compact). Below: each milestone as a row
// with task bars between today and the milestone. Click → focus that row.

const { useState: useStateV3, useMemo: useMemoV3 } = React;

function HybridTimeline() {
  const [store, updateStore] = useStore();
  const [selectedId, setSelectedId] = useStateV3("milestone13");
  const [zoom, setZoom] = useStateV3(1);
  const [pan, setPan] = useStateV3(0);

  const range = useMemoV3(() => {
    const dates = MILESTONES.map(m => parseDate(m.date)).concat(MILESTONES.flatMap(m => m.tasks.map(t => parseDate(t.due))));
    dates.push(parseDate(TODAY));
    const min = new Date(Math.min(...dates)); min.setDate(min.getDate() - 3);
    const max = new Date(Math.max(...dates)); max.setDate(max.getDate() + 3);
    return { min, max };
  }, []);

  const baseW = 1200;
  const totalW = baseW * zoom;
  const dayToX = (iso) => {
    const t = (parseDate(iso) - range.min) / (range.max - range.min);
    return 30 + t * (totalW - 60);
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
    if (e.target.closest("[data-task]") || e.target.closest("[data-milestone]")) return;
    const startX = e.clientX, startPan = pan;
    const move = (ev) => setPan(startPan + (ev.clientX - startX));
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const weekTicks = useMemoV3(() => {
    const ticks = [];
    const d = new Date(range.min);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d <= range.max) {
      ticks.push(new Date(d).toISOString().slice(0, 10));
      d.setDate(d.getDate() + 7);
    }
    return ticks;
  }, [range]);

  const ROW_H = 56;
  const TOP_H = 90;
  const totalH = TOP_H + MILESTONES.length * ROW_H + 20;

  const tog = (id) => updateStore(s => { s.tasks[id] = s.tasks[id] || {}; s.tasks[id].done = !s.tasks[id].done; return s; });
  const setD = (id, d) => updateStore(s => { s.tasks[id] = { ...(s.tasks[id]||{}), due: d }; return s; });

  return (
    <div style={{
      width: "100%", height: "100%", background: "#faf7ee", color: "#1f1f1f",
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", display: "flex", alignItems: "baseline", gap: 14, borderBottom: "1px solid #e6e1d2" }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>PEGASUS</span>
        <span style={{ fontSize: 13, color: "#857d6a" }}>Timeline & Tasks · MAY–JUN 2026</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#857d6a", fontFamily: "ui-monospace, monospace" }}>
          <span>scroll = pan · ⌘+scroll = zoom</span>
          <button onClick={() => { setZoom(1); setPan(0); }} style={hybBtn}>reset</button>
          <button onClick={() => setZoom(z => Math.max(0.6, z / 1.2))} style={hybBtn}>−</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} style={hybBtn}>+</button>
        </div>
      </div>

      {/* Left labels + scrolling chart */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left: milestone labels */}
        <div style={{ width: 170, flexShrink: 0, borderRight: "1px solid #e6e1d2", background: "#f5f1e3" }}>
          <div style={{ height: TOP_H, borderBottom: "1px solid #e6e1d2",
            display: "flex", alignItems: "center", padding: "0 14px",
            fontSize: 10, color: "#a89a78", letterSpacing: 1.5, fontFamily: "ui-monospace, monospace" }}>
            MILESTONE
          </div>
          {MILESTONES.map(m => {
            const isSel = m.id === selectedId;
            const tasks = getMilestoneTasks(store, m);
            const done = tasks.filter(t => getTaskState(store, t).done).length;
            return (
              <div key={m.id} onClick={() => setSelectedId(m.id)}
                style={{
                  height: ROW_H, padding: "0 14px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  borderBottom: "1px solid #ece6d4", cursor: "pointer",
                  background: isSel ? "#fff" : "transparent",
                  borderLeft: isSel ? `3px solid ${m.color}` : "3px solid transparent",
                }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.color, letterSpacing: 0.3 }}>{m.short}</div>
                <div style={{ fontSize: 11, color: "#857d6a", fontFamily: "ui-monospace, monospace", display: "flex", justifyContent: "space-between" }}>
                  <span>{fmtDate(m.date)}</span>
                  <span>{done}/{tasks.length}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: scrollable chart */}
        <div onWheel={onWheel} onMouseDown={onMouseDown}
          style={{ flex: 1, overflow: "hidden", position: "relative", cursor: "grab" }}>
          <svg width={totalW} height={totalH} style={{ position: "absolute", left: pan, top: 0 }}>
            {/* Week grid */}
            {weekTicks.map((iso) => (
              <g key={iso} transform={`translate(${dayToX(iso)}, 0)`}>
                <line x1={0} y1={TOP_H} x2={0} y2={totalH} stroke="#ece6d4" strokeWidth={1} />
                <text x={4} y={TOP_H - 8} fontSize={10} fill="#a89a78" fontFamily="ui-monospace, monospace">
                  {fmtDate(iso).toUpperCase()}
                </text>
              </g>
            ))}

            {/* Today line */}
            <g transform={`translate(${dayToX(TODAY)}, 0)`}>
              <line x1={0} y1={TOP_H - 4} x2={0} y2={totalH} stroke="#3B7BC9" strokeWidth={1.5} strokeDasharray="3 4" />
              <rect x={-26} y={TOP_H - 24} width={52} height={16} rx={2} fill="#3B7BC9" />
              <text x={0} y={TOP_H - 13} fontSize={9} fill="#fff" textAnchor="middle"
                fontFamily="ui-monospace, monospace" fontWeight={700} letterSpacing={1}>TODAY</text>
            </g>

            {/* Top spine: compact milestone markers */}
            <line x1={dayToX(range.min.toISOString().slice(0,10))} y1={45}
                  x2={dayToX(range.max.toISOString().slice(0,10))} y2={45}
                  stroke="#1f1f1f" strokeWidth={1.5} />
            {MILESTONES.map(m => {
              const x = dayToX(m.date);
              const isSel = m.id === selectedId;
              return (
                <g key={m.id} data-milestone style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId(m.id)}>
                  <circle cx={x} cy={45} r={isSel ? 8 : 6}
                    fill={isSel ? m.color : "#fff"} stroke={m.color} strokeWidth={2} />
                  <text x={x} y={28} fontSize={10} fontWeight={700} fill={m.color}
                    textAnchor="middle" fontFamily="ui-monospace, monospace" letterSpacing={0.5}>
                    {m.short.split(" ")[0]}
                  </text>
                  <text x={x} y={64} fontSize={10} fill="#666" textAnchor="middle"
                    fontFamily="ui-monospace, monospace">
                    {fmtDate(m.date)}
                  </text>
                </g>
              );
            })}

            {/* Rows: task bars */}
            {MILESTONES.map((m, ri) => {
              const y = TOP_H + ri * ROW_H;
              const isSel = m.id === selectedId;
              const tasks = getMilestoneTasks(store, m);
              const msX = dayToX(m.date);
              return (
                <g key={m.id}>
                  {isSel && <rect x={0} y={y} width={totalW} height={ROW_H} fill="#fff" opacity={0.6} />}
                  <line x1={0} y1={y + ROW_H} x2={totalW} y2={y + ROW_H} stroke="#ece6d4" strokeWidth={1} />
                  {/* Connect today → milestone */}
                  <line x1={dayToX(TODAY)} y1={y + ROW_H/2} x2={msX} y2={y + ROW_H/2}
                    stroke={m.color} strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
                  {/* Milestone marker on row */}
                  <g transform={`translate(${msX}, ${y + ROW_H/2})`}>
                    <rect x={-6} y={-6} width={12} height={12} transform="rotate(45)"
                      fill={m.color} stroke={m.color} strokeWidth={1.5} />
                  </g>
                  {/* Task chips */}
                  {tasks.map((task, ti) => {
                    const st = getTaskState(store, task);
                    const tx = dayToX(st.due);
                    // Stagger vertically to avoid overlap when same date
                    const stackY = y + ROW_H/2 + ((ti % 2) === 0 ? -14 : 14);
                    return (
                      <TaskBar key={task.id} x={tx} y={stackY}
                        task={task} state={st} accent={m.color}
                        onToggle={() => tog(task.id)} onDateChange={(d) => setD(task.id, d)} />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom: detail strip for selected milestone */}
      <HybridDetail milestone={MILESTONES.find(m => m.id === selectedId)}
        store={store} updateStore={updateStore} />
    </div>
  );
}

function TaskBar({ x, y, task, state, accent, onToggle, onDateChange }) {
  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startDate = parseDate(state.due);
    let lastDays = 0;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const days = Math.round(dx / 6);
      if (days !== lastDays) {
        lastDays = days;
        const nd = new Date(startDate); nd.setDate(nd.getDate() + days);
        onDateChange(nd.toISOString().slice(0, 10));
      }
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  // Width: text-based, capped
  const w = Math.min(120, Math.max(60, state.label.length * 6 + 22));
  return (
    <g data-task style={{ cursor: "ew-resize" }} transform={`translate(${x - w/2}, ${y - 9})`}
      onMouseDown={startDrag} onDoubleClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <rect x={0} y={0} width={w} height={18} rx={9}
        fill={state.done ? "#e8e6df" : accent + "22"}
        stroke={accent} strokeWidth={1.2} />
      <circle cx={9} cy={9} r={3.5} fill={state.done ? accent : "#fff"} stroke={accent} strokeWidth={1.2} />
      <text x={17} y={12.5} fontSize={10}
        fill={state.done ? "#999" : "#1f1f1f"}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        textDecoration={state.done ? "line-through" : "none"}>
        {state.label.length > 16 ? state.label.slice(0, 14) + "…" : state.label}
      </text>
    </g>
  );
}

const hybBtn = {
  background: "#fff", color: "#333", border: "1px solid #d9d3c0",
  padding: "3px 9px", borderRadius: 4, cursor: "pointer",
  fontFamily: "inherit", fontSize: 11,
};

function HybridDetail({ milestone, store, updateStore }) {
  if (!milestone) return null;
  const tasks = getMilestoneTasks(store, milestone);
  const [newLabel, setNewLabel] = useStateV3("");
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
    <div style={{
      flex: "0 0 auto", maxHeight: "38%", overflow: "auto",
      borderTop: "1px solid #e6e1d2", background: "#fff",
      padding: "14px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#a89a78", letterSpacing: 1.5 }}>SELECTED</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: milestone.color }}>{milestone.short}</span>
        <span style={{ fontSize: 14, color: "#1f1f1f" }}>{milestone.title}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#857d6a", fontFamily: "ui-monospace, monospace" }}>
          {fmtDateLong(milestone.date)} · T{daysFromToday(milestone.date) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(milestone.date))}d
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: "6px 12px", alignItems: "center" }}>
        {tasks.map(task => {
          const st = getTaskState(store, task);
          return (
            <React.Fragment key={task.id}>
              <input type="checkbox" checked={st.done} onChange={() => tog(task.id)}
                style={{ width: 16, height: 16, accentColor: milestone.color, cursor: "pointer" }} />
              <div style={{ fontSize: 13, color: st.done ? "#aaa" : "#1f1f1f",
                textDecoration: st.done ? "line-through" : "none" }}>{st.label}</div>
              <DueDateChip value={st.due} onChange={(d) => setD(task.id, d)} accent={milestone.color} />
              <AssigneePicker assignees={st.assignees} onChange={(a) => setA(task.id, a)} />
              <CommentPopover value={st.comment} onChange={(c) => setC(task.id, c)} accent={milestone.color} />
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <span style={{ color: "#a89a78", fontSize: 14 }}>＋</span>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="add task to this milestone…"
          style={{
            flex: 1, background: "#faf7ee", border: "1px solid #e6e1d2", borderRadius: 4,
            padding: "5px 10px", fontSize: 13, fontFamily: "inherit", outline: "none",
          }} />
      </div>
    </div>
  );
}

Object.assign(window, { HybridTimeline });
