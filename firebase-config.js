// ─── Firebase Configuration ─────────────────────────────────
//
// 1. Open https://console.firebase.google.com
// 2. Wähle dein bestehendes Projekt (oder erstelle ein neues)
// 3. Sidebar → "Build" → "Firestore Database" → "Create database"
//    - Modus: "Start in test mode" (für die Anfangsphase OK)
//    - Region: nimm eu-west3 (Frankfurt) oder eur3 (multi-region EU)
// 4. Sidebar → ⚙️ "Project settings" → Tab "General" → ganz unten "Your apps"
//    → klick auf </> Web → app-name "pegasus-timeline" → Register
//    → Kopiere das firebaseConfig-Objekt hier rein (siehe unten)
// 5. Setze ENABLE_FIREBASE = true.
//
// Sicherheit: Bevor du das öffentlich teilst, geh in Firestore → "Rules" und
// schränk Zugriff ein, z.B. nur für angemeldete User oder mit einer Allowlist.
// Default Test-Mode rules laufen nach 30 Tagen ab.

window.ENABLE_FIREBASE = true;   // ← auf true setzen wenn ready

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBhH9yHPw1ukriJDAUubl99zKo2JVVraJw",
  authDomain: "pegasus-timeline.firebaseapp.com",
  projectId: "pegasus-timeline",
  storageBucket: "pegasus-timeline.firebasestorage.app",
  messagingSenderId: "281213375872",
  appId: "1:281213375872:web:52463e369ea9bf527e9d65",
};
