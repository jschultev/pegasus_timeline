// Clean Light Timeline – v2
// Light, technical, day-level grid. Subtasks dock at their due-date column.
// Click any task → modal with notes / assignees / date / etc.

const { useState: useStateCL, useRef: useRefCL, useEffect: useEffectCL, useMemo: useMemoCL } = React;

const ACCENT = "#1f1f1f";
const ACCENT_BLUE = "#2563eb";
const SURFACE = "#ffffff";
const SURFACE_2 = "#fafaf7";
const SURFACE_3 = "#f3f1ea";
const BORDER = "#e5e2d8";
const BORDER_STRONG = "#d6d2c4";
const TEXT = "#1f1f1f";
const TEXT_2 = "#6b6b6b";
const TEXT_3 = "#a0a0a0";
const TODAY_C = "#2563eb";
const WARN = "#dc4c2e";

function CleanLight() {
  const [store, updateStore] = useStore();
  const [selectedDay, setSelectedDay] = useStateCL(TODAY);
  const [taskModal, setTaskModal] = useStateCL(null); // { taskId, milestoneId }
  const [zoom, setZoom] = useStateCL(1);
  const [pan, setPan] = useStateCL(0);

  // Range: from earliest task/milestone to last
  const range = useMemoCL(() => {
    const dates = MILESTONES.map(m => parseDate(m.date))
      .concat(MILESTONES.flatMap(m => m.tasks.map(t => parseDate(t.due))));
    dates.push(parseDate(TODAY));
    const min = new Date(Math.min(...dates)); min.setDate(min.getDate() - 2);
    const max = new Date(Math.max(...dates)); max.setDate(max.getDate() + 2);
    const days = Math.round((max - min) / 86400000);
    return { min, max, days };
  }, []);

  // Day-level grid: each day is its own column
  const DAY_W_BASE = 38;
  const dayW = DAY_W_BASE * zoom;
  const totalW = (range.days + 1) * dayW + 60;

  const dayToX = (iso) => {
    const d = parseDate(iso);
    const dayIdx = Math.round((d - range.min) / 86400000);
    return 30 + dayIdx * dayW + dayW / 2;
  };

  const allDays = useMemoCL(() => {
    const arr = [];
    const d = new Date(range.min);
    for (let i = 0; i <= range.days; i++) {
      arr.push(new Date(d).toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [range]);

  // All tasks grouped by due date
  const tasksByDay = useMemoCL(() => {
    const map = {};
    for (const ms of MILESTONES) {
      for (const task of getMilestoneTasks(store, ms)) {
        const st = getTaskState(store, task);
        if (!map[st.due]) map[st.due] = [];
        map[st.due].push({ task, state: st, ms });
      }
    }
    return map;
  }, [store]);

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(3, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    } else {
      e.preventDefault();
      setPan(p => p - (e.deltaX || e.deltaY));
    }
  };

  const onMouseDown = (e) => {
    if (e.target.closest("[data-clickable]")) return;
    const startX = e.clientX, startPan = pan;
    const move = (ev) => setPan(startPan + (ev.clientX - startX));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const selectedDayTasks = tasksByDay[selectedDay] || [];
  const selectedMilestone = MILESTONES.find(m => m.date === selectedDay);

  return (
    <div style={{
      width: "100%", height: "100%", background: SURFACE_2, color: TEXT,
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 18,
        padding: "14px 24px", borderBottom: `1px solid ${BORDER}`,
        background: SURFACE,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 11, color: TEXT_3, fontFamily: "ui-monospace, monospace", letterSpacing: 1.5 }}>PROJECT</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>PEGASUS</span>
          <span style={{ fontSize: 13, color: TEXT_2 }}>· Aerospace Studentprojekt · 2026</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: TEXT_2, fontFamily: "ui-monospace, monospace" }}>
          <span>TODAY {fmtDate(TODAY)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{(zoom).toFixed(2)}×</span>
          <button onClick={() => { setZoom(1); setPan(0); }} style={lightBtn}>⊙</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z / 1.2))} style={lightBtn}>−</button>
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} style={lightBtn}>＋</button>
        </div>
      </div>

      {/* Day-level Timeline */}
      <div onWheel={onWheel} onMouseDown={onMouseDown}
        style={{
          flex: "0 0 280px", position: "relative",
          overflow: "hidden", cursor: "grab",
          borderBottom: `1px solid ${BORDER}`,
          background: SURFACE,
        }}>
        <div style={{
          position: "absolute", left: pan, top: 0,
          width: totalW, height: 280,
        }}>
          <DayGrid
            allDays={allDays} dayW={dayW} totalW={totalW}
            range={range} dayToX={dayToX}
            selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            tasksByDay={tasksByDay} setTaskModal={setTaskModal}
            store={store}
          />
        </div>
      </div>

      {/* Bottom: selected day detail + team */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <DayDetailPanel
          selectedDay={selectedDay} milestone={selectedMilestone}
          tasksOnDay={selectedDayTasks}
          store={store} updateStore={updateStore}
          setTaskModal={setTaskModal}
        />
        <CleanTeamPanelLight />
      </div>

      {/* Task modal */}
      {taskModal && (
        <TaskModal
          taskId={taskModal.taskId} milestoneId={taskModal.milestoneId}
          store={store} updateStore={updateStore}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}

const lightBtn = {
  background: SURFACE, color: TEXT, border: `1px solid ${BORDER_STRONG}`,
  width: 26, height: 24, borderRadius: 4, cursor: "pointer",
  fontFamily: "ui-monospace, monospace", fontSize: 12,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function DayGrid({ allDays, dayW, totalW, range, dayToX, selectedDay, setSelectedDay, tasksByDay, setTaskModal, store }) {
  const HEADER_H = 56;
  const SPINE_Y = 95;
  const TASKS_Y = 130;

  // Group tasks per day; stack vertically
  return (
    <svg width={totalW} height={280} style={{ display: "block" }}>
      {/* Day columns */}
      {allDays.map((iso, i) => {
        const x = dayToX(iso);
        const d = parseDate(iso);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isMonday = d.getDay() === 1;
        const isFirstOfMonth = d.getDate() === 1;
        const isSelected = iso === selectedDay;
        const isToday = iso === TODAY;
        const hasTasks = (tasksByDay[iso] || []).length > 0;

        return (
          <g key={iso} data-clickable style={{ cursor: "pointer" }}
            onClick={() => setSelectedDay(iso)}>
            {/* Column hover/selected background */}
            {isSelected && (
              <rect x={x - dayW/2} y={0} width={dayW} height={280}
                fill={ACCENT_BLUE} opacity={0.06} />
            )}
            {isWeekend && !isSelected && (
              <rect x={x - dayW/2} y={0} width={dayW} height={280}
                fill={SURFACE_3} opacity={0.5} />
            )}
            {/* Vertical grid line */}
            <line x1={x - dayW/2} y1={0} x2={x - dayW/2} y2={280}
              stroke={isMonday ? BORDER_STRONG : BORDER}
              strokeWidth={isMonday ? 1 : 0.5}
              strokeDasharray={isMonday ? "0" : "2 3"}
              opacity={isMonday ? 0.7 : 0.5} />

            {/* Header: day */}
            <text x={x} y={20} fontSize={10} textAnchor="middle"
              fill={isToday ? TODAY_C : (isWeekend ? TEXT_3 : TEXT_2)}
              fontFamily="ui-monospace, monospace" fontWeight={isToday ? 700 : 500}>
              {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase().slice(0,2)}
            </text>
            <text x={x} y={36} fontSize={14} textAnchor="middle"
              fill={isToday ? TODAY_C : TEXT}
              fontFamily="ui-monospace, monospace"
              fontWeight={isToday || isMonday || isFirstOfMonth ? 700 : 500}>
              {d.getDate()}
            </text>
            {(isFirstOfMonth || i === 0) && (
              <text x={x} y={50} fontSize={9} textAnchor="middle"
                fill={TEXT_3} fontFamily="ui-monospace, monospace" letterSpacing={1}>
                {d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
              </text>
            )}

            {/* Click affordance under header */}
            <rect x={x - dayW/2} y={0} width={dayW} height={HEADER_H}
              fill="transparent" />
          </g>
        );
      })}

      {/* Today vertical line */}
      <line x1={dayToX(TODAY)} y1={HEADER_H} x2={dayToX(TODAY)} y2={280}
        stroke={TODAY_C} strokeWidth={1.5} strokeDasharray="3 4" />
      <g transform={`translate(${dayToX(TODAY)}, ${HEADER_H - 6})`}>
        <rect x={-22} y={-12} width={44} height={14} rx={2} fill={TODAY_C} />
        <text x={0} y={-2} fontSize={9} fill="#fff" textAnchor="middle"
          fontFamily="ui-monospace, monospace" fontWeight={700} letterSpacing={1}>TODAY</text>
      </g>

      {/* Spine line */}
      <line x1={dayToX(range.min.toISOString().slice(0,10))} y1={SPINE_Y}
            x2={dayToX(range.max.toISOString().slice(0,10))} y2={SPINE_Y}
            stroke={ACCENT} strokeWidth={1.5} />

      {/* Milestones on spine */}
      {MILESTONES.map(m => {
        const x = dayToX(m.date);
        const isSel = m.date === selectedDay;
        const accent = m.tone === "warn" ? WARN : ACCENT;
        return (
          <g key={m.id} data-clickable style={{ cursor: "pointer" }}
            onClick={() => setSelectedDay(m.date)}>
            {/* Diamond */}
            <g transform={`translate(${x}, ${SPINE_Y})`}>
              <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)"
                fill={isSel ? accent : SURFACE} stroke={accent} strokeWidth={2} />
            </g>
            {/* Label above-left */}
            <g transform={`translate(${x}, ${SPINE_Y - 18})`}>
              <text x={0} y={0} fontSize={10} fontWeight={700}
                fill={accent} textAnchor="middle"
                fontFamily="ui-monospace, monospace" letterSpacing={1}>
                {m.short}
              </text>
            </g>
          </g>
        );
      })}

      {/* Task chips per day - stacked below spine */}
      {allDays.map(iso => {
        const tasks = tasksByDay[iso] || [];
        if (tasks.length === 0) return null;
        const x = dayToX(iso);
        const colWidth = Math.max(dayW - 4, 32);
        return (
          <g key={`tasks-${iso}`}>
            {tasks.map((entry, i) => {
              const y = TASKS_Y + i * 24;
              return (
                <TaskChipDay key={entry.task.id}
                  x={x - colWidth/2 + 2} y={y}
                  width={colWidth - 4}
                  task={entry.task} state={entry.state} milestone={entry.ms}
                  onClick={() => setTaskModal({ taskId: entry.task.id, milestoneId: entry.ms.id })}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function TaskChipDay({ x, y, width, task, state, milestone, onClick }) {
  const accent = milestone.tone === "warn" ? WARN : ACCENT;
  const assigned = TEAM.filter(p => state.assignees.includes(p.id));
  const labelW = width - 4 - (assigned.length > 0 ? 18 : 0);
  return (
    <g data-clickable style={{ cursor: "pointer" }} onClick={onClick}>
      <rect x={x} y={y} width={width} height={20} rx={3}
        fill={state.done ? SURFACE_3 : SURFACE}
        stroke={accent} strokeWidth={1} opacity={state.done ? 0.6 : 1} />
      {/* Status dot */}
      <circle cx={x + 8} cy={y + 10} r={3}
        fill={state.done ? accent : SURFACE}
        stroke={accent} strokeWidth={1.2} />
      {/* Label – clipped */}
      <foreignObject x={x + 14} y={y + 2} width={labelW} height={16}>
        <div style={{
          fontSize: 10, color: state.done ? TEXT_3 : TEXT,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textDecoration: state.done ? "line-through" : "none",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          lineHeight: "16px",
        }}>{state.label}</div>
      </foreignObject>
      {/* Assignee chip(s) – just first */}
      {assigned.length > 0 && (
        <g transform={`translate(${x + width - 14}, ${y + 10})`}>
          <circle r={6} fill={assigned[0].color} />
          <text x={0} y={2.5} fontSize={6} fill="#fff" textAnchor="middle"
            fontWeight={700} fontFamily="ui-sans-serif, system-ui, sans-serif">
            {assigned[0].id}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Day Detail Panel (bottom strip) ───────────────────────────
function DayDetailPanel({ selectedDay, milestone, tasksOnDay, store, updateStore, setTaskModal }) {
  const [newLabel, setNewLabel] = useStateCL("");
  const accent = milestone ? (milestone.tone === "warn" ? WARN : ACCENT) : ACCENT_BLUE;
  const dayDate = parseDate(selectedDay);

  const tog = (id) => updateStore(s => { s.tasks[id] = s.tasks[id] || {}; s.tasks[id].done = !s.tasks[id].done; return s; });

  const addToDay = () => {
    if (!newLabel.trim() || !milestone) return;
    updateStore(s => {
      s.custom[milestone.id] = s.custom[milestone.id] || [];
      s.custom[milestone.id].push({
        id: `cust_${Date.now()}`, label: newLabel.trim(),
        due: selectedDay, assignees: [],
      });
      return s;
    });
    setNewLabel("");
  };

  return (
    <div style={{ flex: 1, padding: "20px 28px", overflow: "auto", borderRight: `1px solid ${BORDER}`, background: SURFACE_2 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: TEXT_3, letterSpacing: 1.5 }}>
          {milestone ? "MILESTONE" : "DAY"}
        </span>
        {milestone && <span style={{ width: 8, height: 8, background: accent, transform: "rotate(45deg)", display: "inline-block" }}></span>}
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>
          {milestone ? milestone.title : dayDate.toLocaleDateString("de-DE", { weekday: "long" })}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontFamily: "ui-monospace, monospace", color: TEXT_2 }}>
          {fmtDateLong(selectedDay)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: TEXT_2, marginBottom: 18, fontFamily: "ui-monospace, monospace" }}>
        T{daysFromToday(selectedDay) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(selectedDay))} DAYS · {tasksOnDay.length} {tasksOnDay.length === 1 ? "TASK" : "TASKS"} DUE
      </div>

      {tasksOnDay.length === 0 && (
        <div style={{ fontSize: 13, color: TEXT_3, padding: "20px 0" }}>
          Keine Tasks an diesem Tag fällig. Wähle einen anderen Tag aus dem Kalender oben oder klicke auf einen Milestone.
        </div>
      )}

      {/* Task list (same row UI – click anywhere on row → modal) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasksOnDay.map(({ task, state, ms }) => {
          const msAccent = ms.tone === "warn" ? WARN : ACCENT;
          const assigned = TEAM.filter(p => state.assignees.includes(p.id));
          return (
            <div key={task.id} style={{
              display: "grid", gridTemplateColumns: "20px 80px 1fr auto auto",
              gap: 12, alignItems: "center",
              padding: "10px 14px", background: SURFACE,
              borderRadius: 6, border: `1px solid ${BORDER}`,
              transition: "border-color 0.1s",
            }}>
              <input type="checkbox" checked={state.done}
                onChange={(e) => { e.stopPropagation(); tog(task.id); }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 16, height: 16, accentColor: msAccent, cursor: "pointer" }} />
              {/* Milestone tag */}
              <span style={{
                fontSize: 9, fontFamily: "ui-monospace, monospace", letterSpacing: 1,
                color: msAccent, fontWeight: 700,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{ms.short}</span>
              <div onClick={() => setTaskModal({ taskId: task.id, milestoneId: ms.id })}
                style={{
                  fontSize: 13, color: state.done ? TEXT_3 : TEXT, cursor: "pointer",
                  textDecoration: state.done ? "line-through" : "none",
                }}>{state.label}</div>
              {/* Assignees */}
              <div onClick={() => setTaskModal({ taskId: task.id, milestoneId: ms.id })}
                style={{ display: "inline-flex", cursor: "pointer", minWidth: 24 }}>
                {assigned.length === 0 ? (
                  <span style={{ fontSize: 10, color: TEXT_3, fontStyle: "italic" }}>unassigned</span>
                ) : assigned.slice(0, 3).map((p, i) => (
                  <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -4 }}>
                    <PersonChip person={p} size={20} ring />
                  </span>
                ))}
                {assigned.length > 3 && (
                  <span style={{
                    marginLeft: -4, width: 20, height: 20, borderRadius: "50%",
                    background: "#444", color: "#fff", fontSize: 10, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 0 2px #fff",
                  }}>+{assigned.length - 3}</span>
                )}
              </div>
              <button onClick={() => setTaskModal({ taskId: task.id, milestoneId: ms.id })}
                style={{
                  border: `1px solid ${BORDER_STRONG}`, background: SURFACE_2,
                  color: TEXT_2, fontSize: 11, padding: "4px 10px",
                  borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                }}>open</button>
            </div>
          );
        })}
        {milestone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px dashed ${BORDER_STRONG}`, borderRadius: 6, marginTop: 4 }}>
            <span style={{ color: TEXT_3, fontSize: 14 }}>＋</span>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToDay()}
              placeholder={`add task to ${milestone.short}…`}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                color: TEXT, fontSize: 13, fontFamily: "inherit" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function CleanTeamPanelLight() {
  return (
    <div style={{ width: 200, padding: "20px 22px", overflow: "auto", background: SURFACE, borderLeft: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, color: TEXT_3, letterSpacing: 1.5, fontFamily: "ui-monospace, monospace", marginBottom: 12 }}>TEAM ({TEAM.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TEAM.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PersonChip person={p} size={24} />
            <span style={{ fontSize: 13, color: TEXT }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TASK MODAL ─────────────────────────────────────────────────
function TaskModal({ taskId, milestoneId, store, updateStore, onClose }) {
  const ms = MILESTONES.find(m => m.id === milestoneId);
  const allTasks = getMilestoneTasks(store, ms);
  const task = allTasks.find(t => t.id === taskId);
  if (!task || !ms) return null;
  const st = getTaskState(store, task);
  const accent = ms.tone === "warn" ? WARN : ACCENT;

  // Local draft state for title
  const [labelDraft, setLabelDraft] = useStateCL(st.label);
  useEffectCL(() => setLabelDraft(st.label), [taskId]);

  const tog = () => updateStore(s => { s.tasks[taskId] = s.tasks[taskId] || {}; s.tasks[taskId].done = !s.tasks[taskId].done; return s; });
  const setA = (a) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), assignees: a }; return s; });
  const setC = (c) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), comment: c }; return s; });
  const setD = (d) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), due: d }; return s; });
  const setLabel = (l) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), label: l }; return s; });
  const del = () => {
    if (!confirm("Diese Task löschen?")) return;
    updateStore(s => {
      // mark deleted (simple: store flag) – or remove from custom
      if (taskId.startsWith("cust_")) {
        s.custom[milestoneId] = (s.custom[milestoneId] || []).filter(t => t.id !== taskId);
      } else {
        s.tasks[taskId] = { ...(s.tasks[taskId]||{}), deleted: true };
      }
      return s;
    });
    onClose();
  };

  // Esc to close
  useEffectCL(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Toggle assignee
  const toggleAssignee = (id) => {
    const next = st.assignees.includes(id) ? st.assignees.filter(x => x !== id) : [...st.assignees, id];
    setA(next);
  };

  return (
    <div onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 1000,
        background: "rgba(20, 20, 20, 0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(2px)",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxHeight: "90%", overflow: "auto",
          background: SURFACE, borderRadius: 8,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, background: accent, transform: "rotate(45deg)", display: "inline-block" }}></span>
          <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: accent, letterSpacing: 1.5, fontWeight: 700 }}>
            {ms.short}
          </span>
          <span style={{ fontSize: 10, color: TEXT_3, fontFamily: "ui-monospace, monospace" }}>
            · DUE {fmtDate(st.due).toUpperCase()}
          </span>
          <button onClick={onClose} style={{
            marginLeft: "auto", border: "none", background: "transparent",
            fontSize: 18, color: TEXT_2, cursor: "pointer", padding: 0, width: 24, height: 24,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Title row with checkbox */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <input type="checkbox" checked={st.done} onChange={tog}
              style={{ width: 20, height: 20, accentColor: accent, cursor: "pointer", marginTop: 2 }} />
            <input value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={() => setLabel(labelDraft)}
              onKeyDown={e => { if (e.key === "Enter") { e.target.blur(); } }}
              style={{
                flex: 1, fontSize: 18, fontWeight: 600, color: st.done ? TEXT_3 : TEXT,
                textDecoration: st.done ? "line-through" : "none",
                border: "none", outline: "none", padding: "2px 0",
                fontFamily: "inherit", background: "transparent",
                borderBottom: `1px solid transparent`,
              }}
              onFocus={e => e.target.style.borderBottom = `1px solid ${BORDER}`}
              onBlurCapture={e => e.target.style.borderBottom = `1px solid transparent`}
            />
          </div>

          {/* Field grid */}
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "14px 16px", alignItems: "center" }}>
            <ModalLabel>Due date</ModalLabel>
            <div>
              <input type="date" value={st.due} onChange={e => setD(e.target.value)}
                style={{
                  fontSize: 13, padding: "6px 10px", border: `1px solid ${BORDER_STRONG}`,
                  borderRadius: 4, fontFamily: "ui-monospace, monospace", background: SURFACE_2,
                }} />
              <span style={{ marginLeft: 10, fontSize: 11, color: TEXT_2, fontFamily: "ui-monospace, monospace" }}>
                T{daysFromToday(st.due) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(st.due))}d from today
              </span>
            </div>

            <ModalLabel>Assigned</ModalLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TEAM.map(p => {
                const on = st.assignees.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleAssignee(p.id)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 10px 3px 3px", borderRadius: 999,
                      border: `1px solid ${on ? p.color : BORDER}`,
                      background: on ? p.color + "15" : SURFACE_2,
                      cursor: "pointer", fontSize: 12,
                      fontFamily: "inherit", color: TEXT,
                    }}>
                    <PersonChip person={p} size={20} />
                    {p.name}
                  </button>
                );
              })}
            </div>

            <ModalLabel>Notes</ModalLabel>
            <textarea value={st.comment} onChange={e => setC(e.target.value)}
              placeholder="Add a note about this task…"
              style={{
                minHeight: 80, padding: 10, fontSize: 13,
                border: `1px solid ${BORDER_STRONG}`, borderRadius: 4,
                fontFamily: "inherit", outline: "none", resize: "vertical",
                background: SURFACE_2, color: TEXT,
              }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 10,
          background: SURFACE_2,
        }}>
          <button onClick={del} style={{
            border: `1px solid ${BORDER_STRONG}`, background: SURFACE,
            color: TEXT_2, fontSize: 12, padding: "5px 12px",
            borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
          }}>Delete</button>
          <span style={{ marginLeft: "auto", fontSize: 11, color: TEXT_3, fontFamily: "ui-monospace, monospace" }}>
            Press ESC to close · changes save automatically
          </span>
        </div>
      </div>
    </div>
  );
}

function ModalLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: "ui-monospace, monospace", color: TEXT_3,
      letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase",
    }}>{children}</div>
  );
}

Object.assign(window, { CleanLight });
