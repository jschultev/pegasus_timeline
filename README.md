# PEGASUS Timeline

Interactive project timeline. Day-cards as a linked-list, click any task to assign people, set due dates, add notes.

Auth-gated multi-user mode via Firebase: you create accounts in the Firebase Console, share the URL, team members log in with email + password.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/PEGASUS%20Timeline.html
```

## Setup: Firebase Auth + Firestore

### 1. Firestore (shared data)

- https://console.firebase.google.com → dein Projekt
- *Build* → *Firestore Database* → *Create database* → Region `eur3`
- Test-Mode OK fürs Erste

### 2. Authentication (Login)

- *Build* → *Authentication* → *Get started*
- Tab *Sign-in method* → **Email/Password** aktivieren → Save
- Tab *Users* → **Add user** → Email + Passwort für jeden Team-Member
  - Es gibt keine Self-Registration — du als Owner legst alle Accounts an

### 3. Web-App registrieren

- ⚙️ *Project settings* → Tab *General* → unten **Your apps** → `</>`
- Nickname: `pegasus-timeline` → *Register*
- Du bekommst ein `firebaseConfig` Objekt

### 4. Config eintragen

`firebase-config.js`:
```js
window.ENABLE_FIREBASE = true;
window.FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "deinprojekt.firebaseapp.com",
  projectId:         "deinprojekt",
  storageBucket:     "deinprojekt.appspot.com",
  messagingSenderId: "...",
  appId:             "1:...:web:...",
};
```

### 5. Firestore Rules (kritisch!)

*Firestore Database* → Tab *Rules*:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pegasus/timeline {
      allow read, write: if request.auth != null;
    }
  }
}
```

Nur eingeloggte User dürfen lesen/schreiben. Das ist die wichtigste Zeile — ohne diese wäre die DB öffentlich.

### 6. Authorized Domains

*Authentication* → *Settings* → *Authorized domains* → füge deine GitHub-Pages-Domain hinzu (z.B. `username.github.io`).

## Deploy auf GitHub Pages (Repo darf privat sein)

GitHub Pages funktioniert auch mit **privaten Repos** (sofern du GitHub Pro / Team / Enterprise hast — auf Free-Plan nur public Repos. Falls du Free bist: Repo public machen ist OK, Firebase-Config-Keys sind designt um öffentlich zu sein, der Schutz kommt 100% durch die Auth-Rules).

1. Repo auf GitHub erstellen (privat, falls Pro)
2. Lokal:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin git@github.com:<user>/pegasus-timeline.git
   git push -u origin main
   ```
3. Datei `PEGASUS Timeline.html` zu **`index.html`** umbenennen (kürzere URL)
4. GitHub → Repo → *Settings* → *Pages*
   - Source: *Deploy from a branch*
   - Branch: `main` / `(root)` → Save
5. Nach 1-2 Min: `https://<user>.github.io/pegasus-timeline/`
6. Diese Domain in Firebase Auth → Authorized domains eintragen!

### Wer darf rein?

- Du als Owner legst Accounts in der Firebase-Console an (*Authentication* → *Users* → *Add user*)
- Username = Email-Adresse (kann fake sein, z.B. `johannes@pegasus.local`)
- Passwort wählst du, gibst es der Person weiter (idealerweise gleich Passwort-Wechsel verlangen)
- Account löschen = User raus. Sofort.

## Files

- `PEGASUS Timeline.html` (oder `index.html`) — entry
- `variant-modern.jsx` — UI
- `login.jsx` — Login-Screen
- `data.jsx` — Milestones, Tasks, Team
- `store.jsx` — Auth + Data hooks (auto-switched)
- `interactions.jsx` — shared widgets
- `firebase-config.js` — deine Firebase-Keys
- `tweaks-panel.jsx` — Tweaks panel helper

## Local-only mode

Set `ENABLE_FIREBASE = false` in `firebase-config.js`. Dann läuft alles in
localStorage, kein Login nötig — gut zum Entwickeln.
