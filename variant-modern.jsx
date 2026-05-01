// Clean Modern Timeline – linked-list style day cards
// Days = floating cards on a chain. Tasks = stacked badges on each card.
// Smooth animated zoom, glassmorphic surfaces, refined typography.

const { useState: useStateCM, useRef: useRefCM, useEffect: useEffectCM, useMemo: useMemoCM, useCallback: useCallbackCM } = React;

// Palette: warm dark-toned with cool accents
const C = {
  bg: "#0e0f13",
  bg2: "#13151b",
  surface: "rgba(28, 30, 38, 0.72)",
  surfaceSolid: "#1c1e26",
  surfaceHi: "#252836",
  border: "rgba(255, 255, 255, 0.08)",
  borderHi: "rgba(255, 255, 255, 0.16)",
  text: "#f0eee8",
  text2: "#9ea1ad",
  text3: "#5e6170",
  accent: "#f97316",      // orange (warn / milestones)
  accent2: "#3b82f6",      // blue (info / today)
  accent3: "#10b981",      // green (done)
  glow: "rgba(249, 115, 22, 0.35)",
};

function ModernTimeline({ user, onLogout }) {
  const [store, updateStore] = useStore(user);
  const [selectedDay, setSelectedDay] = useStateCM(TODAY);
  const [taskModal, setTaskModal] = useStateCM(null);
  const [zoom, setZoom] = useStateCM(1);
  const [pan, setPan] = useStateCM(0);
  const [hoverDay, setHoverDay] = useStateCM(null);
  const [adminOpen, setAdminOpen] = useStateCM(false);

  const milestones = useMemoCM(() => getMilestones(store), [store]);
  const team = useMemoCM(() => getTeam(store), [store]);

  // Range: extend a bit
  const range = useMemoCM(() => {
    const dates = milestones.map(m => parseDate(m.date))
      .concat(milestones.flatMap(m => (m.tasks || []).map(t => parseDate(t.due))));
    dates.push(parseDate(TODAY));
    const min = new Date(Math.min(...dates)); min.setDate(min.getDate() - 3);
    const max = new Date(Math.max(...dates)); max.setDate(max.getDate() + 3);
    const days = Math.round((max - min) / 86400000);
    return { min, max, days };
  }, [milestones]);

  const allDays = useMemoCM(() => {
    const arr = [];
    const d = new Date(range.min);
    for (let i = 0; i <= range.days; i++) {
      arr.push(new Date(d).toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [range]);

  const tasksByDay = useMemoCM(() => {
    const map = {};
    for (const ms of milestones) {
      for (const task of getMilestoneTasks(store, ms)) {
        const st = getTaskState(store, task);
        if (!map[st.due]) map[st.due] = [];
        map[st.due].push({ task, state: st, ms });
      }
    }
    return map;
  }, [store, milestones]);

  const milestoneByDate = useMemoCM(() => {
    const m = {};
    milestones.forEach(ms => { m[ms.date] = ms; });
    return m;
  }, [milestones]);

  // Card width scales with zoom; min 60 (collapsed), max 220 (expanded)
  const cardW = 70 + (zoom - 0.5) * 95;     // 0.5 → 70, 2 → 213
  const cardGap = 8 + (zoom - 0.5) * 10;
  const cardH = 200 + (zoom - 0.5) * 80;

  const dayIndex = (iso) => Math.round((parseDate(iso) - range.min) / 86400000);
  const dayToX = (iso) => 80 + dayIndex(iso) * (cardW + cardGap);
  const totalW = 160 + allDays.length * (cardW + cardGap);

  // Wheel: pan horizontally; ctrl/meta = zoom
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom(z => Math.max(0.5, Math.min(2.5, z * factor)));
    } else {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      setPan(p => p - delta);
    }
  };

  const dragRef = useRefCM(null);
  const onMouseDown = (e) => {
    if (e.target.closest("[data-clickable]")) return;
    const startX = e.clientX, startPan = pan;
    let moved = false;
    const move = (ev) => {
      if (Math.abs(ev.clientX - startX) > 3) moved = true;
      setPan(startPan + (ev.clientX - startX));
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  // Keep selected day in view when range changes
  const containerRef = useRefCM(null);
  useEffectCM(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const x = dayToX(TODAY);
    setPan(w / 2 - x);
  }, []);

  // Smooth scroll-to: pan animates when selecting via header
  const scrollToDay = (iso) => {
    const w = containerRef.current?.clientWidth || 800;
    const x = dayToX(iso);
    setPan(w / 2 - x);
  };

  // Compute milestone density per day for the heatmap
  const taskCount = (iso) => (tasksByDay[iso] || []).length;
  const maxTasks = Math.max(1, ...allDays.map(d => taskCount(d)));

  return (
    <div style={{
      width: "100%", height: "100%",
      background: `radial-gradient(ellipse at top, #1a1c25 0%, ${C.bg} 50%, #08090c 100%)`,
      color: C.text,
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
      position: "relative",
    }}>
      {/* Ambient backdrop blobs */}
      <BackdropBlobs />

      {/* Top Bar */}
      <TopBar zoom={zoom} setZoom={setZoom}
        scrollToToday={() => scrollToDay(TODAY)}
        scrollToDay={scrollToDay}
        backend={updateStore.backend || "local"}
        milestones={milestones}
        onAdmin={() => setAdminOpen(true)}
        user={user} onLogout={onLogout} />

      {/* Mini overview strip (heatmap) */}
      <MiniMap allDays={allDays} taskCount={taskCount} maxTasks={maxTasks}
        milestoneByDate={milestoneByDate} selectedDay={selectedDay}
        setSelectedDay={(d) => { setSelectedDay(d); scrollToDay(d); }} />

      {/* Main timeline – linked-list cards */}
      <div ref={containerRef}
        onWheel={onWheel} onMouseDown={onMouseDown}
        style={{
          flex: 1, position: "relative", overflow: "hidden",
          cursor: "grab", minHeight: 0,
        }}>
        {/* Connecting chain (SVG line behind cards) */}
        <ChainLine totalW={totalW} pan={pan} cardH={cardH}
          allDays={allDays} dayToX={dayToX} cardW={cardW}
          tasksByDay={tasksByDay} milestoneByDate={milestoneByDate} />

        {/* Day cards layer */}
        <div style={{
          position: "absolute", left: pan, top: "50%",
          transform: "translateY(-50%)",
          width: totalW, height: cardH + 120,
          transition: "none",
        }}>
          {allDays.map((iso, i) => (
            <DayCard key={iso}
              iso={iso}
              x={dayToX(iso)}
              width={cardW}
              height={cardH}
              tasks={tasksByDay[iso] || []}
              milestone={milestoneByDate[iso]}
              isSelected={iso === selectedDay}
              isToday={iso === TODAY}
              isHover={iso === hoverDay}
              zoom={zoom}
              team={team}
              prevIso={i > 0 ? allDays[i-1] : null}
              onSelect={() => setSelectedDay(iso)}
              onHover={(h) => setHoverDay(h ? iso : null)}
              onTaskClick={(taskId, msId) => setTaskModal({ taskId, milestoneId: msId })}
            />
          ))}
        </div>

        {/* Today vertical glow */}
        <TodayGlow pan={pan} dayToX={dayToX} />
      </div>

      {/* Bottom drawer: selected day detail */}
      <BottomDrawer selectedDay={selectedDay}
        tasksOnDay={tasksByDay[selectedDay] || []}
        milestone={milestoneByDate[selectedDay]}
        store={store} updateStore={updateStore}
        milestones={milestones}
        team={team}
        setTaskModal={setTaskModal}
      />

      {/* Modal */}
      {taskModal && (
        <TaskModalCM taskId={taskModal.taskId} milestoneId={taskModal.milestoneId}
          store={store} updateStore={updateStore}
          milestones={milestones}
          team={team}
          onClose={() => setTaskModal(null)} />
      )}
      {adminOpen && (
        <AdminModal store={store} updateStore={updateStore} onClose={() => setAdminOpen(false)} />
      )}
    </div>
  );
}

// ─── BACKDROP ────────────────────────────────────────────────
function BackdropBlobs() {
  return (
    <>
      <div style={{
        position: "absolute", left: "10%", top: "20%", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", right: "5%", top: "40%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px", pointerEvents: "none", opacity: 0.6,
      }}/>
    </>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────
function TopBar({ zoom, setZoom, scrollToToday, scrollToDay, backend, user, onLogout, milestones, onAdmin }) {
  return (
    <div style={{
      padding: "16px 28px", display: "flex", alignItems: "center", gap: 18,
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(14, 15, 19, 0.72)",
      backdropFilter: "blur(12px)",
      position: "relative", zIndex: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Wordmark */}
        <div style={{
          width: 32, height: 32, borderRadius: 7,
          background: `linear-gradient(135deg, ${C.accent}, #c2410c)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${C.glow}`,
        }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <path d="M2 8 L8 2 L14 8 L8 14 Z" fill="#fff" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.1 }}>PEGASUS</div>
          <div style={{ fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.2 }}>TIMELINE · 2026</div>
        </div>
      </div>

      {/* Phase pills */}
      <div style={{ display: "flex", gap: 4, marginLeft: 24 }}>
        {(milestones || MILESTONES).map(m => {
          return (
            <button key={m.id} onClick={() => scrollToDay(m.date)}
              style={{
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.text2, fontSize: 10, fontWeight: 600,
                padding: "5px 10px", borderRadius: 999, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.accent + "22";
                e.currentTarget.style.borderColor = C.accent;
                e.currentTarget.style.color = C.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.text2;
              }}>
              {m.short.split(" ")[0]}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }}/>

      {/* Backend badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        border: `1px solid ${backend === "firebase" ? "#10b98155" : C.border}`,
        background: backend === "firebase" ? "#10b98114" : "transparent",
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: backend === "firebase" ? "#10b981" : C.text3,
        letterSpacing: 1,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: backend === "firebase" ? "#10b981" : C.text3,
          boxShadow: backend === "firebase" ? "0 0 6px #10b981" : "none",
        }}/>
        {backend === "firebase" ? "SYNCED" : "LOCAL"}
      </div>

      {/* User badge + logout */}
      {user && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "4px 10px 4px 4px", borderRadius: 999,
          border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
          fontSize: 11, color: C.text2,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, #c2410c)`,
            color: "#fff", fontSize: 10, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
          }}>{(user.email || "?").slice(0, 2).toUpperCase()}</div>
          <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
          <button onClick={onLogout} title="Sign out" style={{
            border: "none", background: "transparent", color: C.text3,
            cursor: "pointer", fontSize: 12, padding: "0 4px",
          }}>↪</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onAdmin} title="Settings"
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.text2, width: 32, height: 32, borderRadius: 6,
            cursor: "pointer", fontSize: 15,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>⚙</button>
        <button onClick={scrollToToday} style={{
          background: C.accent2 + "22", border: `1px solid ${C.accent2}`,
          color: C.accent2, fontSize: 11, fontWeight: 600,
          padding: "6px 14px", borderRadius: 6, cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.8,
        }}>◉ TODAY</button>
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden",
          background: "rgba(255,255,255,0.02)",
        }}>
          <button onClick={() => setZoom(z => Math.max(0.5, z / 1.2))} style={ctrlBtn}>−</button>
          <div style={{ padding: "0 12px", fontSize: 11, color: C.text2,
            fontFamily: "'JetBrains Mono', monospace", minWidth: 56, textAlign: "center", borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
            {(zoom * 100).toFixed(0)}%
          </div>
          <button onClick={() => setZoom(z => Math.min(2.5, z * 1.2))} style={ctrlBtn}>＋</button>
        </div>
      </div>
    </div>
  );
}

const ctrlBtn = {
  background: "transparent", border: "none", color: C.text2,
  width: 32, height: 28, cursor: "pointer", fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

// ─── MINI MAP ────────────────────────────────────────────────
function MiniMap({ allDays, taskCount, maxTasks, milestoneByDate, selectedDay, setSelectedDay }) {
  return (
    <div style={{
      padding: "10px 28px 12px", borderBottom: `1px solid ${C.border}`,
      background: "rgba(14, 15, 19, 0.5)", backdropFilter: "blur(8px)",
      position: "relative", zIndex: 4,
    }}>
      <div style={{
        fontSize: 9, color: C.text3, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 1.5, marginBottom: 6,
      }}>OVERVIEW · APR – JUN 2026</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 32 }}>
        {allDays.map(iso => {
          const c = taskCount(iso);
          const ms = milestoneByDate[iso];
          const isToday = iso === TODAY;
          const isSel = iso === selectedDay;
          const intensity = c / maxTasks;
          const h = c === 0 ? 4 : 8 + intensity * 22;
          const bg = ms ? C.accent : (c > 0 ? `rgba(59, 130, 246, ${0.3 + intensity * 0.6})` : "rgba(255,255,255,0.06)");
          return (
            <div key={iso}
              onClick={() => setSelectedDay(iso)}
              data-clickable
              title={`${fmtDate(iso)} · ${c} task${c !== 1 ? "s" : ""}${ms ? " · " + ms.short : ""}`}
              style={{
                flex: 1, height: h, minWidth: 3, borderRadius: 1.5,
                background: bg, cursor: "pointer",
                border: isSel ? `1px solid ${C.text}` : (isToday ? `1px solid ${C.accent2}` : "none"),
                transition: "all 0.15s",
                position: "relative",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── CHAIN LINE (SVG behind cards) ───────────────────────────
function ChainLine({ totalW, pan, cardH, allDays, dayToX, cardW, tasksByDay, milestoneByDate }) {
  // The chain runs at the visual middle of cards
  const yMid = "50%";
  return (
    <svg width={totalW} height="100%"
      style={{
        position: "absolute", left: pan, top: 0, pointerEvents: "none",
      }}>
      <defs>
        <linearGradient id="chainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.text3} stopOpacity={0.4}/>
          <stop offset="50%" stopColor={C.text} stopOpacity={0.6}/>
          <stop offset="100%" stopColor={C.text3} stopOpacity={0.4}/>
        </linearGradient>
        <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Dashed background line */}
      <line x1={dayToX(allDays[0])} y1="50%"
            x2={dayToX(allDays[allDays.length-1])} y2="50%"
            stroke="url(#chainGrad)" strokeWidth={1.5}
            strokeDasharray="4 6" />
      {/* Connector ticks – small dot at each card center */}
      {allDays.map(iso => {
        const ms = milestoneByDate[iso];
        const x = dayToX(iso);
        return (
          <g key={iso}>
            <circle cx={x} cy="50%" r={ms ? 3 : 1.5}
              fill={ms ? C.accent : C.text3}
              opacity={ms ? 0.9 : 0.5}
              filter={ms ? "url(#glow1)" : ""} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── TODAY GLOW ──────────────────────────────────────────────
function TodayGlow({ pan, dayToX }) {
  const x = dayToX(TODAY) + pan;
  return (
    <div style={{
      position: "absolute", left: x - 60, top: 0, width: 120, height: "100%",
      background: `radial-gradient(ellipse at center, ${C.accent2}22, transparent 70%)`,
      pointerEvents: "none", transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    }}/>
  );
}

// ─── DAY CARD ────────────────────────────────────────────────
function DayCard({ iso, x, width, height, tasks, milestone, isSelected, isToday, isHover, zoom, team, onSelect, onHover, onTaskClick }) {
  const d = parseDate(iso);
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const isMonday = d.getDay() === 1;

  // Visual variants based on density / type
  const hasMilestone = !!milestone;
  const taskCount = tasks.length;

  // Card background
  let bg = C.surface;
  let border = C.border;
  let shadow = "0 4px 16px rgba(0,0,0,0.25)";
  if (hasMilestone && isToday) {
    bg = `linear-gradient(180deg, ${C.surfaceHi}, ${C.surfaceSolid})`;
    border = milestone.tone === "warn" ? C.accent : C.text2;
    shadow = `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${border}, 0 0 32px ${C.glow}, 0 0 0 4px ${C.accent2}55`;
  } else if (hasMilestone) {
    bg = `linear-gradient(180deg, ${C.surfaceHi}, ${C.surfaceSolid})`;
    border = milestone.tone === "warn" ? C.accent : C.text2;
    shadow = `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${border}, 0 0 32px ${C.glow}`;
  } else if (isToday) {
    border = C.accent2;
    shadow = `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${C.accent2}88`;
  } else if (isSelected) {
    border = C.borderHi;
    shadow = `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${C.text}66`;
  }

  // Weekend dim
  const opacity = isWeekend && !hasMilestone && taskCount === 0 ? 0.45 : 1;

  const showFullLabel = zoom >= 0.85;
  const showTaskLabels = zoom >= 1.0;

  return (
    <div data-clickable
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        position: "absolute", left: x - width/2, top: 0,
        width, height,
        background: bg, backdropFilter: "blur(12px)",
        border: `1px solid ${border}`, borderRadius: 12,
        boxShadow: shadow,
        opacity,
        cursor: "pointer",
        transition: "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s",
        transform: isHover ? "translateY(-3px) scale(1.02)" : "translateY(0)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
      {/* Header strip: weekday + day + month */}
      <div style={{
        padding: "10px 10px 8px", borderBottom: `1px solid ${C.border}`,
        background: hasMilestone
          ? `linear-gradient(180deg, ${milestone.tone === "warn" ? C.accent + "22" : C.text2 + "22"}, transparent)`
          : "rgba(255,255,255,0.02)",
        position: "relative",
      }}>
        <div style={{
          fontSize: 9, color: hasMilestone ? (milestone.tone === "warn" ? C.accent : C.text) : (isToday ? C.accent2 : C.text3),
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, fontWeight: 700,
        }}>
          {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
          <div style={{
            fontSize: 28 + (zoom - 0.5) * 6, fontWeight: 700, lineHeight: 1,
            color: isToday ? C.accent2 : C.text,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1,
          }}>{d.getDate()}</div>
          {(showFullLabel || isMonday || d.getDate() === 1) && (
            <div style={{
              fontSize: 10, color: C.text3,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
            }}>{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</div>
          )}
        </div>
        {isToday && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            width: 6, height: 6, borderRadius: "50%",
            background: C.accent2,
            boxShadow: `0 0 8px ${C.accent2}, 0 0 0 3px ${C.accent2}33`,
          }}/>
        )}
      </div>

      {/* Milestone banner (if present) */}
      {hasMilestone && (
        <div style={{
          padding: "6px 10px",
          background: milestone.tone === "warn" ? C.accent : C.text,
          color: milestone.tone === "warn" ? "#fff" : C.bg,
          fontSize: 9, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.2,
          display: "flex", alignItems: "center", gap: 6,
          flexShrink: 0,
        }}>
          <svg width={8} height={8} viewBox="0 0 8 8">
            <rect x={0} y={0} width={8} height={8} transform="rotate(45 4 4)" fill="currentColor"/>
          </svg>
          {showFullLabel ? milestone.short : "★"}
        </div>
      )}

      {/* Tasks list */}
      <div style={{
        flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 4,
        overflow: "hidden",
      }}>
        {tasks.length === 0 && !hasMilestone && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 4, height: 4, borderRadius: "50%",
              background: C.text3, opacity: 0.4,
            }}/>
          </div>
        )}
        {tasks.map(({ task, state, ms }) => (
          <TaskBadge key={task.id} task={task} state={state} ms={ms}
            compact={!showTaskLabels}
            team={team}
            onClick={(e) => { e.stopPropagation(); onTaskClick(task.id, ms.id); }} />
        ))}
      </div>
    </div>
  );
}

// ─── TASK BADGE on a card ────────────────────────────────────
function TaskBadge({ task, state, ms, compact, onClick, team: teamProp }) {
  const [hover, setHover] = useStateCM(false);
  const accent = ms.tone === "warn" ? C.accent : C.text;
  const team = teamProp || TEAM;
  const assigned = team.filter(p => state.assignees.includes(p.id));

  if (compact) {
    return (
      <div data-clickable onClick={onClick}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        title={state.label}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 5px", borderRadius: 4,
          background: state.done ? "rgba(255,255,255,0.04)" : `${accent}1a`,
          border: `1px solid ${state.done ? C.border : accent + "55"}`,
          cursor: "pointer",
          transform: hover ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.12s",
        }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: state.done ? C.accent3 : accent,
          flexShrink: 0,
        }}/>
        {assigned.length > 0 && (
          <PersonChip person={assigned[0]} size={12} />
        )}
      </div>
    );
  }

  return (
    <div data-clickable onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 8px", borderRadius: 6,
        background: state.done ? "rgba(255,255,255,0.03)" : `${accent}14`,
        border: `1px solid ${state.done ? C.border : accent + "44"}`,
        cursor: "pointer",
        transition: "all 0.12s",
        transform: hover ? "translateX(2px)" : "translateX(0)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: state.done ? C.accent3 : accent,
          flexShrink: 0, boxShadow: state.done ? `0 0 6px ${C.accent3}` : "none",
        }}/>
        <div style={{
          fontSize: 10, lineHeight: 1.3,
          color: state.done ? C.text3 : C.text,
          textDecoration: state.done ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{state.label}</div>
      </div>
      {assigned.length > 0 && (
        <div style={{ display: "flex", marginLeft: 12 }}>
          {assigned.slice(0, 4).map((p, i) => (
            <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -4 }}>
              <PersonChip person={p} size={14} ring />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BOTTOM DRAWER ───────────────────────────────────────────
function BottomDrawer({ selectedDay, tasksOnDay, milestone, store, updateStore, setTaskModal, milestones: milestonesProp, team: teamProp }) {
  const milestones = milestonesProp || MILESTONES;
  const team = teamProp || TEAM;
  const [newLabel, setNewLabel] = useStateCM("");
  const accent = milestone ? (milestone.tone === "warn" ? C.accent : C.text) : C.accent2;
  const tog = (id) => updateStore(s => { s.tasks[id] = s.tasks[id] || {}; s.tasks[id].done = !s.tasks[id].done; return s; });

  const addToDay = () => {
    if (!newLabel.trim()) return;
    const targetMs = milestone || milestones.find(m => parseDate(m.date) >= parseDate(selectedDay)) || milestones[milestones.length-1];
    updateStore(s => {
      s.custom[targetMs.id] = s.custom[targetMs.id] || [];
      s.custom[targetMs.id].push({
        id: `cust_${Date.now()}`, label: newLabel.trim(),
        due: selectedDay, assignees: [],
      });
      return s;
    });
    setNewLabel("");
  };

  return (
    <div style={{
      flex: "0 0 auto", maxHeight: "32%", minHeight: 140,
      borderTop: `1px solid ${C.border}`,
      background: "rgba(14, 15, 19, 0.85)", backdropFilter: "blur(16px)",
      padding: "16px 28px", overflow: "auto",
      position: "relative", zIndex: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{
          width: 4, height: 28, borderRadius: 2, background: accent,
          boxShadow: `0 0 12px ${accent}66`,
        }}/>
        <div>
          <div style={{ fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, fontWeight: 600 }}>
            {milestone ? "MILESTONE" : "DAY"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
            {milestone ? milestone.title : parseDate(selectedDay).toLocaleDateString("en-US", { weekday: "long" })}
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ fontSize: 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
          <div>{fmtDateLong(selectedDay)}</div>
          <div style={{ color: C.text3, marginTop: 2 }}>
            T{daysFromToday(selectedDay) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(selectedDay))}d · {tasksOnDay.length} due
          </div>
        </div>
      </div>

      {tasksOnDay.length === 0 ? (
        <div style={{
          fontSize: 12, color: C.text3, padding: "12px 0", textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ─── nothing due on this day ───
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
          {tasksOnDay.map(({ task, state, ms }) => {
            const msAccent = ms.tone === "warn" ? C.accent : C.text;
            const assigned = team.filter(p => state.assignees.includes(p.id));
            return (
              <div key={task.id}
                onClick={() => setTaskModal({ taskId: task.id, milestoneId: ms.id })}
                style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 10,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = msAccent + "55";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = C.border;
                }}>
                <input type="checkbox" checked={state.done}
                  onChange={() => tog(task.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 16, height: 16, accentColor: msAccent, cursor: "pointer" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, color: msAccent, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.2 }}>{ms.short}</span>
                  </div>
                  <div style={{
                    fontSize: 13, color: state.done ? C.text3 : C.text,
                    textDecoration: state.done ? "line-through" : "none",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{state.label}</div>
                </div>
                <div style={{ display: "inline-flex", flexShrink: 0 }}>
                  {assigned.length === 0 ? (
                    <span style={{ fontSize: 9, color: C.text3, fontStyle: "italic" }}>—</span>
                  ) : assigned.slice(0, 3).map((p, i) => (
                    <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -4 }}>
                      <PersonChip person={p} size={20} ring />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 8,
        border: `1px dashed ${C.border}`,
      }}>
        <span style={{ color: C.text3, fontSize: 14 }}>＋</span>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addToDay()}
          placeholder={`Add task on ${fmtDate(selectedDay)}…`}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: C.text, fontSize: 13, fontFamily: "inherit",
          }} />
      </div>
    </div>
  );
}

// ─── TASK MODAL (modern, dark) ────────────────────────────────
function TaskModalCM({ taskId, milestoneId, store, updateStore, onClose, milestones: milestonesProp, team: teamProp }) {
  const ms = (milestonesProp || MILESTONES).find(m => m.id === milestoneId);
  const team = teamProp || TEAM;
  const allTasks = getMilestoneTasks(store, ms);
  const task = allTasks.find(t => t.id === taskId);
  if (!task || !ms) return null;
  const st = getTaskState(store, task);
  const accent = ms.tone === "warn" ? C.accent : C.text;

  const [labelDraft, setLabelDraft] = useStateCM(st.label);
  useEffectCM(() => setLabelDraft(st.label), [taskId]);

  const tog = () => updateStore(s => { s.tasks[taskId] = s.tasks[taskId] || {}; s.tasks[taskId].done = !s.tasks[taskId].done; return s; });
  const setA = (a) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), assignees: a }; return s; });
  const setC = (c) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), comment: c }; return s; });
  const setD = (d) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), due: d }; return s; });
  const setLabel = (l) => updateStore(s => { s.tasks[taskId] = { ...(s.tasks[taskId]||{}), label: l }; return s; });

  useEffectCM(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toggleAssignee = (id) => {
    const next = st.assignees.includes(id) ? st.assignees.filter(x => x !== id) : [...st.assignees, id];
    setA(next);
  };

  const del = () => {
    if (!confirm("Delete this task?")) return;
    updateStore(s => {
      if (taskId.startsWith("cust_")) {
        s.custom[milestoneId] = (s.custom[milestoneId] || []).filter(t => t.id !== taskId);
      } else {
        s.tasks[taskId] = { ...(s.tasks[taskId]||{}), deleted: true };
      }
      return s;
    });
    onClose();
  };

  const moveToMilestone = (newMsId) => {
    if (newMsId === milestoneId) return;
    updateStore(s => {
      if (taskId.startsWith("cust_")) {
        const obj = (s.custom[milestoneId] || []).find(t => t.id === taskId);
        if (obj) {
          s.custom[milestoneId] = s.custom[milestoneId].filter(t => t.id !== taskId);
          s.custom[newMsId] = [...(s.custom[newMsId] || []), obj];
        }
      } else {
        const ov = s.tasks[taskId] || {};
        const newId = `cust_${Date.now()}`;
        s.tasks[taskId] = { ...ov, deleted: true };
        s.custom[newMsId] = [...(s.custom[newMsId] || []), {
          id: newId,
          label: ov.label ?? task.label,
          due: ov.due ?? task.due,
          assignees: ov.assignees ?? task.assignees ?? [],
        }];
        if (ov.done || ov.comment) {
          s.tasks[newId] = { done: !!ov.done, comment: ov.comment || "" };
        }
      }
      return s;
    });
    onClose();
  };

  return (
    <div onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 1000,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(6px)",
        animation: "modalFade 0.18s ease-out",
      }}>
      <style>{`
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlide { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: 540, maxHeight: "90%", overflow: "auto",
          background: `linear-gradient(180deg, ${C.surfaceHi}, ${C.surfaceSolid})`,
          borderRadius: 14, border: `1px solid ${C.borderHi}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          animation: "modalSlide 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
          background: `linear-gradient(180deg, ${accent}11, transparent)`,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: accent, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${accent}66`,
          }}>
            <svg width={10} height={10} viewBox="0 0 10 10">
              <rect x={0} y={0} width={10} height={10} transform="rotate(45 5 5)" fill={ms.tone === "warn" ? "#fff" : C.bg}/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 9, color: accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, fontWeight: 700 }}>
              {ms.short}
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>{ms.title}</div>
          </div>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={{
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.text2, cursor: "pointer", width: 28, height: 28,
            borderRadius: 6, fontSize: 14,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <button onClick={tog}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: `1.5px solid ${st.done ? C.accent3 : C.borderHi}`,
                background: st.done ? C.accent3 : "transparent",
                cursor: "pointer", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", marginTop: 2,
              }}>
              {st.done && <svg width={12} height={12} viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 3" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            <input value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={() => setLabel(labelDraft)}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
              style={{
                flex: 1, fontSize: 20, fontWeight: 700,
                color: st.done ? C.text3 : C.text,
                textDecoration: st.done ? "line-through" : "none",
                border: "none", outline: "none", padding: "2px 0",
                fontFamily: "inherit", background: "transparent",
                borderBottom: `1px solid transparent`,
                letterSpacing: -0.3,
              }}
            />
          </div>

          {/* Milestone */}
          <div>
            <ModalLabelCM>Milestone</ModalLabelCM>
            <select value={milestoneId} onChange={e => moveToMilestone(e.target.value)}
              style={{
                fontSize: 13, padding: "8px 12px",
                border: `1px solid ${C.border}`, borderRadius: 6,
                fontFamily: "inherit",
                background: "rgba(255,255,255,0.04)",
                color: accent, colorScheme: "dark",
                cursor: "pointer", outline: "none",
              }}>
              {(milestonesProp || MILESTONES).map(m => (
                <option key={m.id} value={m.id} style={{ background: C.surfaceSolid, color: C.text }}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <ModalLabelCM>Due Date</ModalLabelCM>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="date" value={st.due} onChange={e => setD(e.target.value)}
                style={{
                  fontSize: 13, padding: "8px 12px",
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "rgba(255,255,255,0.04)",
                  color: C.text, colorScheme: "dark",
                }} />
              <span style={{ fontSize: 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace" }}>
                T{daysFromToday(st.due) >= 0 ? "−" : "+"}{Math.abs(daysFromToday(st.due))}d
              </span>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <ModalLabelCM>Assigned ({st.assignees.length})</ModalLabelCM>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {team.map(p => {
                const on = st.assignees.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleAssignee(p.id)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "4px 11px 4px 4px", borderRadius: 999,
                      border: `1px solid ${on ? p.color : C.border}`,
                      background: on ? p.color + "22" : "rgba(255,255,255,0.03)",
                      cursor: "pointer", fontSize: 12,
                      fontFamily: "inherit", color: on ? C.text : C.text2,
                      transition: "all 0.12s",
                    }}>
                    <PersonChip person={p} size={20} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <ModalLabelCM>Notes</ModalLabelCM>
            <textarea value={st.comment} onChange={e => setC(e.target.value)}
              placeholder="Add a note about this task…"
              style={{
                width: "100%", minHeight: 80, padding: 12, fontSize: 13,
                border: `1px solid ${C.border}`, borderRadius: 6,
                fontFamily: "inherit", outline: "none", resize: "vertical",
                background: "rgba(255,255,255,0.03)", color: C.text,
                boxSizing: "border-box",
              }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(0,0,0,0.2)",
        }}>
          <button onClick={del} style={{
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.text2, fontSize: 11, padding: "6px 12px",
            borderRadius: 6, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
          }}>DELETE</button>
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            ESC to close · auto-saves
          </span>
        </div>
      </div>
    </div>
  );
}

function ModalLabelCM({ children }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.text3,
      letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase",
      marginBottom: 8,
    }}>{children}</div>
  );
}

// ─── ADMIN MODAL (Settings: Milestones + Team) ────────────────
function AdminModal({ store, updateStore, onClose }) {
  const [tab, setTab] = useStateCM("milestones");
  const [editId, setEditId] = useStateCM(null);
  const [draft, setDraft] = useStateCM({});

  const milestones = getMilestones(store);
  const team = getTeam(store);

  useEffectCM(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const cancelEdit = () => setEditId(null);

  // ─── Milestone handlers ───
  const startEditMs = (ms) => { setEditId(ms.id); setDraft({ ...ms }); };

  const saveMs = () => {
    const isBase = MILESTONES.some(m => m.id === draft.id);
    updateStore(s => {
      if (isBase) {
        s.milestoneOverrides = s.milestoneOverrides || {};
        s.milestoneOverrides[draft.id] = { title: draft.title, short: draft.short, date: draft.date, color: draft.color, tone: draft.tone };
      } else {
        s.customMilestones = (s.customMilestones || []).map(m => m.id === draft.id ? { ...m, ...draft } : m);
      }
      return s;
    });
    setEditId(null);
  };

  const addMs = () => {
    const id = `ms_${Date.now()}`;
    const newMs = { id, title: "New Milestone", short: "NEW", date: TODAY, color: "#E8634A", tone: "warn", tasks: [] };
    updateStore(s => { s.customMilestones = [...(s.customMilestones || []), newMs]; return s; });
    setEditId(id); setDraft(newMs);
  };

  const delMs = (ms) => {
    if (!confirm(`Delete "${ms.title}"?`)) return;
    const isBase = MILESTONES.some(m => m.id === ms.id);
    updateStore(s => {
      if (isBase) {
        s.deletedMilestones = [...(s.deletedMilestones || []), ms.id];
      } else {
        s.customMilestones = (s.customMilestones || []).filter(m => m.id !== ms.id);
      }
      return s;
    });
    if (editId === ms.id) setEditId(null);
  };

  // ─── Team handlers ───
  const startEditPerson = (p) => { setEditId(p.id); setDraft({ ...p }); };

  const savePerson = () => {
    const isBase = TEAM.some(p => p.id === draft.id);
    updateStore(s => {
      if (isBase) {
        s.teamOverrides = s.teamOverrides || {};
        s.teamOverrides[draft.id] = { name: draft.name, color: draft.color };
      } else {
        s.customTeam = (s.customTeam || []).map(p => p.id === draft.id ? { ...p, ...draft } : p);
      }
      return s;
    });
    setEditId(null);
  };

  const addPerson = () => {
    const id = `P${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const palette = ["#E8634A","#3B7BC9","#2EAF6E","#B85AC8","#E8A82C","#1FA9A0","#7059D6","#D04F87"];
    const newP = { id, name: "New Person", color: palette[Math.floor(Math.random() * palette.length)] };
    updateStore(s => { s.customTeam = [...(s.customTeam || []), newP]; return s; });
    setEditId(id); setDraft(newP);
  };

  const delPerson = (p) => {
    if (!confirm(`Remove "${p.name}" from the team?`)) return;
    const isBase = TEAM.some(tp => tp.id === p.id);
    updateStore(s => {
      if (isBase) {
        s.deletedTeam = [...(s.deletedTeam || []), p.id];
      } else {
        s.customTeam = (s.customTeam || []).filter(tp => tp.id !== p.id);
      }
      return s;
    });
    if (editId === p.id) setEditId(null);
  };

  const inp = (extra = {}) => ({
    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
    borderRadius: 5, padding: "5px 8px", color: C.text,
    fontSize: 12, fontFamily: "inherit", outline: "none", ...extra,
  });

  const rowStyle = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: 6,
    background: "rgba(255,255,255,0.02)",
  };

  const editBox = {
    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderHi}`,
    borderRadius: 8, padding: 14,
  };

  const actionBtn = (color = C.text2) => ({
    background: "transparent", border: `1px solid ${C.border}`,
    color, fontSize: 10, padding: "3px 8px", borderRadius: 4,
    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3,
  });

  const labelStyle = {
    fontSize: 9, color: C.text3, fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1.2, marginBottom: 4,
  };

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, maxHeight: "85vh",
        background: `linear-gradient(180deg, ${C.surfaceHi}, ${C.surfaceSolid})`,
        borderRadius: 14, border: `1px solid ${C.borderHi}`,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 22px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>Settings</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.text2, cursor: "pointer", width: 28, height: 28,
            borderRadius: 6, fontSize: 14,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", padding: "0 22px",
          borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          {["milestones", "team"].map(t => (
            <button key={t} onClick={() => { setTab(t); setEditId(null); }}
              style={{
                background: "transparent", border: "none",
                borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                color: tab === t ? C.text : C.text2,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1, textTransform: "uppercase", marginBottom: -1,
              }}>
              {t === "milestones" ? "Milestones" : "Team"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 22px", flex: 1, overflowY: "auto" }}>

          {/* ── Milestones tab ── */}
          {tab === "milestones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {milestones.map(ms => (
                <div key={ms.id}>
                  {editId === ms.id ? (
                    <div style={editBox}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={labelStyle}>TITLE</div>
                          <input value={draft.title || ""} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                            style={{ ...inp(), width: "100%", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={labelStyle}>SHORT NAME</div>
                          <input value={draft.short || ""} onChange={e => setDraft(d => ({ ...d, short: e.target.value }))}
                            style={{ ...inp(), width: "100%", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={labelStyle}>DATE</div>
                          <input type="date" value={draft.date || ""} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                            style={{ ...inp(), width: "100%", boxSizing: "border-box", colorScheme: "dark" }} />
                        </div>
                        <div>
                          <div style={labelStyle}>COLOR & STYLE</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="color" value={draft.color || "#E8634A"}
                              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                              style={{ width: 32, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0, borderRadius: 4 }} />
                            <button onClick={() => setDraft(d => ({ ...d, tone: d.tone === "warn" ? "neutral" : "warn" }))}
                              style={{
                                ...inp(), cursor: "pointer",
                                color: draft.tone === "warn" ? C.accent : C.text2,
                                borderColor: draft.tone === "warn" ? C.accent + "66" : C.border,
                              }}>
                              {draft.tone === "warn" ? "warn" : "neutral"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveMs} style={{
                          background: C.accent, border: "none", color: "#fff",
                          fontSize: 11, padding: "5px 14px", borderRadius: 5, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>SAVE</button>
                        <button onClick={cancelEdit} style={{ ...actionBtn(), padding: "5px 14px" }}>CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div style={rowStyle}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", background: ms.color, flexShrink: 0,
                        boxShadow: ms.tone === "warn" ? `0 0 6px ${ms.color}88` : "none",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ms.title}</div>
                        <div style={{ fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                          {ms.short} · {fmtDate(ms.date)}
                        </div>
                      </div>
                      <button onClick={() => startEditMs(ms)} style={actionBtn()}>EDIT</button>
                      <button onClick={() => delMs(ms)} style={actionBtn("#f87171")}>DEL</button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addMs} style={{
                marginTop: 8, background: "transparent",
                border: `1px dashed ${C.border}`, color: C.text2,
                fontSize: 11, padding: "8px", borderRadius: 6, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", width: "100%",
              }}>+ ADD MILESTONE</button>
            </div>
          )}

          {/* ── Team tab ── */}
          {tab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {team.map(p => (
                <div key={p.id}>
                  {editId === p.id ? (
                    <div style={editBox}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={labelStyle}>NAME</div>
                          <input value={draft.name || ""} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                            style={{ ...inp(), width: "100%", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={labelStyle}>COLOR</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="color" value={draft.color || "#666666"}
                              onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                              style={{ width: 32, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                            <span style={{ fontSize: 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace" }}>{draft.color}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={savePerson} style={{
                          background: C.accent, border: "none", color: "#fff",
                          fontSize: 11, padding: "5px 14px", borderRadius: 5, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>SAVE</button>
                        <button onClick={cancelEdit} style={{ ...actionBtn(), padding: "5px 14px" }}>CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div style={rowStyle}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                      <PersonChip person={p} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>{p.id}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <button onClick={() => startEditPerson(p)} style={actionBtn()}>EDIT</button>
                      <button onClick={() => delPerson(p)} style={actionBtn("#f87171")}>DEL</button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addPerson} style={{
                marginTop: 8, background: "transparent",
                border: `1px dashed ${C.border}`, color: C.text2,
                fontSize: 11, padding: "8px", borderRadius: 6, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", width: "100%",
              }}>+ ADD PERSON</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModernTimeline });
