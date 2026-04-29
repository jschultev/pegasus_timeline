// Variant 1: Whiteboard-Marker-Style
// Hommage at the original whiteboard. Hand-drawn vibe but interactive.
// Pan/zoom horizontal timeline + click milestone → detail panel slides up.

const { useState: useStateV1, useRef: useRefV1, useEffect: useEffectV1, useMemo: useMemoV1 } = React;

function WhiteboardTimeline() {
  const [store, updateStore] = useStore();
  const [selectedId, setSelectedId] = useStateV1("milestone13");
  const [zoom, setZoom] = useStateV1(1);
  const [pan, setPan] = useStateV1(0);
  const railRef = useRefV1(null);

  // Time range: from a bit before earliest to a bit after latest
  const range = useMemoV1(() => {
    const dates = MILESTONES.map(m => parseDate(m.date)).concat(WEEK_MARKERS.map(w => parseDate(w.date)));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + 3);
    return { min, max, days: Math.round((max - min) / 86400000) };
  }, []);

  const baseWidth = 1400;
  const totalWidth = baseWidth * zoom;
  const dayToX = (iso) => {
    const d = parseDate(iso);
    const t = (d - range.min) / (range.max - range.min);
    return 60 + t * (totalWidth - 120);
  };

  // Wheel zoom
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.6, Math.min(4, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      setPan(p => p - e.deltaX);
    }
  };

  // Drag to pan
  const onMouseDown = (e) => {
    if (e.target.closest("[data-milestone]") || e.target.closest("button")) return;
    const startX = e.clientX;
    const startPan = pan;
    const move = (ev) => setPan(startPan + (ev.clientX - startX));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const selected = MILESTONES.find(m => m.id === selectedId);

  return (
    <div style={{
      width: "100%", height: "100%", background: "#f6f1e6",
      backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.04), transparent 60%)",
      fontFamily: "'Caveat', 'Bradley Hand', 'Comic Sans MS', cursive",
      color: "#1f1f1f", overflow: "hidden", position: "relative",
      display: "flex", flexDirection: "column",
    }}>
      {/* Magnet decorations */}
      <Magnets />

      {/* Header */}
      <div style={{ padding: "20px 32px 8px", display: "flex", alignItems: "baseline", gap: 16, position: "relative", zIndex: 2 }}>
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 700, color: "#c63a1f", letterSpacing: 1 }}>
          PEGASUS Timeline
        </h1>
        <span style={{ fontSize: 18, color: "#666", fontFamily: "'Caveat', cursive" }}>
          Rocket Project · MAY–JUN 2026
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 12, color: "#666" }}>
          <span>scroll = pan · ⌘+scroll = zoom</span>
          <button onClick={() => { setZoom(1); setPan(0); }} style={btnStyle}>reset</button>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} style={btnStyle}>+</button>
          <button onClick={() => setZoom(z => Math.max(0.6, z / 1.2))} style={btnStyle}>−</button>
        </div>
      </div>

      {/* Timeline rail */}
      <div
        ref={railRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        style={{
          flex: "0 0 auto", height: 280, position: "relative",
          overflow: "hidden", cursor: "grab", margin: "0 16px",
        }}>
        <svg
          width={totalWidth} height={280}
          style={{ position: "absolute", left: pan, top: 0, transition: "none" }}
        >
          {/* Spine */}
          <line
            x1={dayToX(range.min.toISOString().slice(0,10))}
            y1={140}
            x2={dayToX(range.max.toISOString().slice(0,10))}
            y2={140}
            stroke="#1f1f1f" strokeWidth={2.2} strokeLinecap="round"
            strokeDasharray="0"
          />
          {/* Dashed lead-in */}
          <line x1={20} y1={140} x2={dayToX(range.min.toISOString().slice(0,10)) + 10} y2={140}
            stroke="#1f1f1f" strokeWidth={2} strokeDasharray="6 6" strokeLinecap="round" />

          {/* Today marker */}
          <g transform={`translate(${dayToX(TODAY)}, 0)`}>
            <line x1={0} y1={70} x2={0} y2={210} stroke="#3B7BC9" strokeWidth={2} strokeDasharray="3 4" />
            <text x={-30} y={225} fontSize={18} fill="#3B7BC9" fontFamily="'Caveat', cursive" fontWeight={700}>
              We are here
            </text>
            <path d={`M -8 215 L 0 205 L 8 215`} fill="none" stroke="#3B7BC9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Week markers (small ticks) */}
          {WEEK_MARKERS.map(w => (
            <g key={w.date} transform={`translate(${dayToX(w.date)}, 140)`}>
              <line x1={0} y1={-6} x2={0} y2={6} stroke="#888" strokeWidth={1.4} />
              <text x={6} y={-12} fontSize={13} fill="#888" fontFamily="'Caveat', cursive">{w.label}</text>
            </g>
          ))}

          {/* Milestones */}
          {MILESTONES.map((m, i) => {
            const x = dayToX(m.date);
            const isSel = m.id === selectedId;
            const tasks = getMilestoneTasks(store, m);
            const done = tasks.filter(t => getTaskState(store, t).done).length;
            const above = i % 2 === 0;
            const labelY = above ? 80 : 200;
            return (
              <g key={m.id} data-milestone style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(m.id)}>
                {/* Wobbly circle (hand-drawn) */}
                <circle cx={x} cy={140} r={isSel ? 22 : 16}
                  fill={isSel ? m.color : "#fff"}
                  stroke={m.color} strokeWidth={isSel ? 3 : 2.5} />
                {isSel && <circle cx={x} cy={140} r={28} fill="none" stroke={m.color} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />}
                {/* Label connector */}
                <line x1={x} y1={above ? 124 : 156} x2={x} y2={above ? 100 : 180}
                  stroke={m.color} strokeWidth={1.2} />
                {/* Label text */}
                <text x={x} y={labelY} fontSize={20} fontWeight={700}
                  fill={m.color} textAnchor="middle"
                  fontFamily="'Caveat', cursive">
                  {m.short}
                </text>
                <text x={x} y={labelY + 18} fontSize={14}
                  fill="#444" textAnchor="middle"
                  fontFamily="'Caveat', cursive">
                  {fmtDate(m.date)}
                </text>
                {/* Progress dot count */}
                <text x={x} y={labelY + 34} fontSize={11}
                  fill="#666" textAnchor="middle"
                  fontFamily="ui-monospace, monospace">
                  {done}/{tasks.length}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          milestone={selected}
          store={store}
          updateStore={updateStore}
        />
      )}

      {/* Legend / team */}
      <TeamLegend />
    </div>
  );
}

const btnStyle = {
  border: "1px solid #c8c2b3", background: "#fff", color: "#333",
  padding: "3px 9px", borderRadius: 6, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12,
};

function Magnets() {
  const positions = [
    { x: "2%", y: "8%", c: "#d44" }, { x: "1%", y: "30%", c: "#e8a82c" },
    { x: "1.5%", y: "60%", c: "#222" }, { x: "98%", y: "12%", c: "#3B7BC9" },
    { x: "98.5%", y: "55%", c: "#d44" }, { x: "97%", y: "90%", c: "#e8a82c" },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: 14, height: 14, borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${p.c}cc, ${p.c} 60%, ${p.c}99)`,
          boxShadow: "inset -2px -2px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
          zIndex: 1, pointerEvents: "none",
        }} />
      ))}
    </>
  );
}

function DetailPanel({ milestone, store, updateStore }) {
  const tasks = getMilestoneTasks(store, milestone);
  const [newLabel, setNewLabel] = useStateV1("");

  const toggleDone = (taskId) => {
    updateStore(s => {
      s.tasks[taskId] = s.tasks[taskId] || {};
      s.tasks[taskId].done = !s.tasks[taskId].done;
      return s;
    });
  };
  const setAssignees = (taskId, list) => {
    updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), assignees: list }; return s; });
  };
  const setComment = (taskId, c) => {
    updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), comment: c }; return s; });
  };
  const setDue = (taskId, d) => {
    updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), due: d }; return s; });
  };
  const addTask = () => {
    if (!newLabel.trim()) return;
    updateStore(s => {
      s.custom[milestone.id] = s.custom[milestone.id] || [];
      s.custom[milestone.id].push({
        id: `cust_${Date.now()}`, label: newLabel.trim(),
        due: milestone.date, assignees: [],
      });
      return s;
    });
    setNewLabel("");
  };

  return (
    <div style={{
      flex: 1, margin: "12px 24px 16px", background: "#fffef7",
      border: "2px solid #1f1f1f", borderRadius: 4,
      boxShadow: "4px 4px 0 #1f1f1f22, inset 0 0 0 1px #fff",
      padding: "16px 22px", overflow: "auto", position: "relative", zIndex: 2,
      display: "flex", flexDirection: "column", minHeight: 0,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, borderBottom: "2px dashed #c8c2b3", paddingBottom: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: milestone.color }}>{milestone.short}</span>
        <span style={{ fontSize: 22, color: "#1f1f1f" }}>{fmtDateLong(milestone.date)}</span>
        <span style={{ marginLeft: "auto", fontSize: 16, color: "#666" }}>
          {daysFromToday(milestone.date) > 0
            ? `in ${daysFromToday(milestone.date)} days`
            : daysFromToday(milestone.date) === 0 ? "today" : `${-daysFromToday(milestone.date)} days ago`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: "8px 14px", alignItems: "center", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <div style={hdrCol}>Done</div>
        <div style={hdrCol}>Task</div>
        <div style={hdrCol}>Due</div>
        <div style={hdrCol}>Assigned</div>
        <div style={hdrCol}>Note</div>

        {tasks.map(task => {
          const st = getTaskState(store, task);
          return (
            <React.Fragment key={task.id}>
              <input type="checkbox" checked={st.done}
                onChange={() => toggleDone(task.id)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: milestone.color }} />
              <div style={{
                fontFamily: "'Caveat', cursive", fontSize: 19, color: st.done ? "#999" : "#222",
                textDecoration: st.done ? "line-through" : "none",
              }}>{st.label}</div>
              <DueDateChip value={st.due} onChange={(d) => setDue(task.id, d)} accent={milestone.color} />
              <AssigneePicker assignees={st.assignees} onChange={(a) => setAssignees(task.id, a)} />
              <CommentPopover value={st.comment} onChange={(c) => setComment(task.id, c)} accent={milestone.color} />
            </React.Fragment>
          );
        })}

        {/* Add task row */}
        <div></div>
        <input value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="+ add task…"
          style={{
            border: "none", borderBottom: "1px dashed #b8b2a3", background: "transparent",
            fontFamily: "'Caveat', cursive", fontSize: 18, color: "#888",
            padding: "2px 0", outline: "none",
          }} />
        <div></div><div></div><div></div>
      </div>
    </div>
  );
}

const hdrCol = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "#999", fontWeight: 600,
};

function TeamLegend() {
  return (
    <div style={{
      padding: "0 32px 14px", display: "flex", gap: 8, flexWrap: "wrap",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      position: "relative", zIndex: 2,
    }}>
      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1.2, alignSelf: "center", marginRight: 6 }}>Team</span>
      {TEAM.map(p => (
        <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#444" }}>
          <PersonChip person={p} size={20} />
          {p.name}
        </span>
      ))}
    </div>
  );
}

Object.assign(window, { WhiteboardTimeline });
