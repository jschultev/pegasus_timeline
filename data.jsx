// PEGASUS Timeline – Project data extracted from whiteboard
// Year: 2026

const TEAM = [
  { id: "JO", name: "Johannes", color: "#E8634A" },
  { id: "LE", name: "Lennard",  color: "#3B7BC9" },
  { id: "ST", name: "Stefano",  color: "#2EAF6E" },
  { id: "MA", name: "Mattia",   color: "#B85AC8" },
  { id: "JA", name: "Jan",      color: "#E8A82C" },
  { id: "FE", name: "Federico", color: "#1FA9A0" },
  { id: "TH", name: "Thomas",   color: "#7059D6" },
  { id: "VA", name: "Valentin", color: "#D04F87" },
  { id: "FR", name: "Freelncr", color: "#6B6B6B" },
];

// Milestones in chronological order. Dates are 2026.
// Each milestone has tasks (id, label, due, assignees: id[]).
const MILESTONES = [
  {
    id: "wallinj",
    title: "Wall & Injector",
    short: "WALL & INJ",
    date: "2026-04-30", // "31. APR" on the board → treat as end of April
    color: "#E8634A",
    tone: "warn",
    tasks: [
      { id: "w1", label: "V-Nut Thing",        due: "2026-04-30", assignees: [] },
      { id: "w2", label: "Verify TDs",         due: "2026-04-30", assignees: [] },
      { id: "w3", label: "Send out to Manufact.", due: "2026-04-30", assignees: [] },
    ],
  },
  {
    id: "core",
    title: "Core / TC-Board",
    short: "CORE · TC-BOARD",
    date: "2026-05-08",
    color: "#E8634A",
    tone: "warn",
    tasks: [
      { id: "c1", label: "CFDs – Redesign",        due: "2026-05-08", assignees: [] },
      { id: "c2", label: "Radio FEAs?",            due: "2026-05-08", assignees: [] },
      { id: "c3", label: "AM Fit",                 due: "2026-05-04", assignees: [] },
      { id: "c4", label: "Design",                 due: "2026-05-01", assignees: [] },
      { id: "c5", label: "Review",                 due: "2026-05-04", assignees: [] },
      { id: "c6", label: "Order",                  due: "2026-05-08", assignees: [] },
    ],
  },
  {
    id: "milestone13",
    title: "Milestone Review",
    short: "MILESTONE",
    date: "2026-05-13",
    color: "#1F1F1F",
    tone: "neutral",
    tasks: [
      { id: "m1", label: "Structure & Content Outline + Discussion", due: "2026-05-04", assignees: [] },
      { id: "m2", label: "First Good Draft",                          due: "2026-05-07", assignees: [] },
      { id: "m3", label: "Section View PLA + Full Assembly",          due: "2026-05-12", assignees: [] },
    ],
  },
  {
    id: "rollout",
    title: "Roll-Out",
    short: "ROLL-OUT",
    date: "2026-05-27",
    color: "#E8634A",
    tone: "warn",
    tasks: [
      { id: "r1", label: "Video",               due: "2026-05-25", assignees: [] },
      { id: "r2", label: "Posters",             due: "2026-05-25", assignees: [] },
      { id: "r3", label: "Presentation",        due: "2026-05-01", assignees: [] },
      { id: "r4", label: "Flag",                due: "2026-05-05", assignees: [] },
      { id: "r5", label: "Eng-Box / Stands",    due: "2026-05-25", assignees: [] },
      { id: "r6", label: "Goodies (Little Eng)", due: "2026-05-25", assignees: [] },
    ],
  },
  {
    id: "finalreport",
    title: "Final Report",
    short: "FINAL REPORT",
    date: "2026-05-29",
    color: "#E8634A",
    tone: "warn",
    tasks: [
      { id: "f1", label: "Finish Documentation & Hi-Lite", due: "2026-05-27", assignees: [] },
      { id: "f2", label: "Refine",                          due: "2026-05-29", assignees: [] },
      { id: "f3", label: "First Final Draft",               due: "2026-05-28", assignees: [] },
    ],
  },
  {
    id: "finalpres",
    title: "Final Presentation",
    short: "FINAL PRES.",
    date: "2026-06-11",
    color: "#E8634A",
    tone: "warn",
    tasks: [
      { id: "p1", label: "Good Draft", due: "2026-06-08", assignees: [] },
    ],
  },
];

// Week markers shown on the spine (the "MO X.X" labels on the board)
const WEEK_MARKERS = [
  { date: "2026-05-04", label: "MO 4.05", note: "Flag · Miles-Draft" },
  { date: "2026-05-11", label: "MO 11.05", note: "" },
  { date: "2026-05-18", label: "MO 18.05", note: "" },
  { date: "2026-05-25", label: "MO 25.05", note: "" },
  { date: "2026-06-01", label: "MO 01.06", note: "" },
  { date: "2026-06-08", label: "MO 08.06", note: "" },
  { date: "2026-06-15", label: "MO 15.06", note: "" },
];

const TODAY = new Date().toISOString().slice(0, 10);

// Date helpers
const parseDate = (s) => new Date(s + "T00:00:00");
const fmtDate = (s) => {
  const d = parseDate(s);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
};
const fmtDateLong = (s) => {
  const d = parseDate(s);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
};
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const daysFromToday = (s) => daysBetween(TODAY, s);

// Make available globally (Babel scripts don't share scope)
Object.assign(window, {
  TEAM, MILESTONES, WEEK_MARKERS, TODAY,
  parseDate, fmtDate, fmtDateLong, daysBetween, daysFromToday,
});
