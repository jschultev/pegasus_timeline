// PEGASUS Timeline – Auth + Store with Firebase backend
//
// - Email/password sign-in via Firebase Auth
// - Realtime shared state via Firestore (when signed in)
// - Falls back to localStorage when ENABLE_FIREBASE=false

const STORE_KEY = "pegasus_timeline_v1";

// ─── localStorage backend ──────────────────────────────────────
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { tasks: {}, custom: {} };
    return JSON.parse(raw);
  } catch (e) { return { tasks: {}, custom: {} }; }
}
function saveLocal(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
}

// ─── Firebase singletons ───────────────────────────────────────
let _fb = null;     // { app, db, auth, doc, onSnapshot, setDoc, signIn, signOut, onAuthStateChanged }

async function initFirebase() {
  if (_fb) return _fb;
  if (!window.FIREBASE_CONFIG || !window.ENABLE_FIREBASE) return null;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
    const { getFirestore, doc, onSnapshot, setDoc } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } =
      await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
    const app = initializeApp(window.FIREBASE_CONFIG);
    const db = getFirestore(app);
    const auth = getAuth(app);
    _fb = {
      app, db, auth,
      doc: doc(db, "pegasus", "timeline"),
      onSnapshot, setDoc,
      signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
      signOut: () => signOut(auth),
      onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
    };
    return _fb;
  } catch (e) {
    console.error("Firebase init failed:", e);
    return null;
  }
}

// ─── Auth Hook ─────────────────────────────────────────────────
function useAuth() {
  const [state, setState] = React.useState({
    ready: false,         // Firebase loaded?
    user: null,           // signed-in user (email/uid) or null
    enabled: !!window.ENABLE_FIREBASE,
    error: null,
  });

  React.useEffect(() => {
    if (!window.ENABLE_FIREBASE) {
      setState(s => ({ ...s, ready: true, enabled: false }));
      return;
    }
    let unsub = null;
    (async () => {
      const fb = await initFirebase();
      if (!fb) { setState(s => ({ ...s, ready: true, error: "init failed" })); return; }
      unsub = fb.onAuthStateChanged((u) => {
        setState({ ready: true, enabled: true, user: u, error: null });
      });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const login = async (email, pw) => {
    const fb = await initFirebase();
    if (!fb) throw new Error("Firebase not configured");
    try {
      await fb.signIn(email, pw);
      setState(s => ({ ...s, error: null }));
    } catch (e) {
      setState(s => ({ ...s, error: e.code || e.message }));
      throw e;
    }
  };
  const logout = async () => {
    const fb = await initFirebase();
    if (fb) await fb.signOut();
  };

  return { ...state, login, logout };
}

// ─── Data Store Hook ───────────────────────────────────────────
function useStore(authUser) {
  const [store, setStore] = React.useState(loadLocal);
  const [backend, setBackend] = React.useState("local");
  const fbRef = React.useRef(null);
  const unsubRef = React.useRef(null);

  React.useEffect(() => {
    // Cleanup previous listener
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    if (!window.ENABLE_FIREBASE || !authUser) {
      setBackend("local");
      setStore(loadLocal());
      fbRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const fb = await initFirebase();
      if (cancelled || !fb) return;
      fbRef.current = fb;
      setBackend("firebase");
      unsubRef.current = fb.onSnapshot(fb.doc, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setStore({ tasks: d.tasks || {}, custom: d.custom || {} });
        } else {
          const seed = { tasks: {}, custom: {} };
          fb.setDoc(fb.doc, seed).catch(console.error);
          setStore(seed);
        }
      }, (err) => console.error("Firestore listen error:", err));
    })();
    return () => { cancelled = true; if (unsubRef.current) unsubRef.current(); };
  }, [authUser?.uid]);

  const update = React.useCallback((fn) => {
    setStore((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      if (fbRef.current) {
        fbRef.current.setDoc(fbRef.current.doc, next).catch(console.error);
      } else {
        saveLocal(next);
      }
      return next;
    });
  }, []);

  update.backend = backend;
  return [store, update];
}

// ─── Effective task data ──────────────────────────────────────
function getTaskState(store, task) {
  const ov = store.tasks[task.id] || {};
  return {
    done: !!ov.done,
    assignees: ov.assignees ?? task.assignees ?? [],
    comment: ov.comment ?? "",
    due: ov.due ?? task.due,
    label: ov.label ?? task.label,
    deleted: !!ov.deleted,
  };
}
function getMilestoneTasks(store, milestone) {
  const custom = store.custom[milestone.id] || [];
  const defaults = milestone.tasks.filter(t => !(store.tasks[t.id]?.deleted));
  return [...defaults, ...custom];
}
function getAllTasks(store) {
  const all = [];
  for (const ms of MILESTONES) {
    for (const t of getMilestoneTasks(store, ms)) {
      all.push({ ...t, ms });
    }
  }
  return all;
}

Object.assign(window, {
  useAuth, useStore, getTaskState, getMilestoneTasks, getAllTasks, STORE_KEY,
});
