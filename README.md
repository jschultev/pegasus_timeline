# PEGASUS Timeline

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/PEGASUS%20Timeline.html
```

## Files

- `index.html` — entry
- `variant-modern.jsx` — UI
- `login.jsx` — Login-Screen
- `data.jsx` — Milestones, Tasks, Team
- `store.jsx` — Auth + Data hooks (auto-switched)
- `interactions.jsx` — shared widgets
- `firebase-config.js` — deine Firebase-Keys
- `tweaks-panel.jsx` — Tweaks panel helper

## Local-only mode

Set `ENABLE_FIREBASE = false` in `firebase-config.js`. Dann läuft alles in
localStorage, kein Login nötig, gut zum Entwickeln.
