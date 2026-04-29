// Login screen – shown until the user is authenticated via Firebase Auth.

const { useState: useStateLogin } = React;

const L_C = {
  bg: "#0e0f13",
  surface: "#1c1e26",
  surfaceHi: "#252836",
  border: "rgba(255,255,255,0.08)",
  borderHi: "rgba(255,255,255,0.16)",
  text: "#f0eee8",
  text2: "#9ea1ad",
  text3: "#5e6170",
  accent: "#f97316",
  danger: "#ef4444",
};

function LoginScreen({ onLogin, error, enabled }) {
  const [email, setEmail] = useStateLogin("");
  const [pw, setPw] = useStateLogin("");
  const [busy, setBusy] = useStateLogin(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !pw) return;
    setBusy(true);
    try { await onLogin(email, pw); }
    catch (err) {/* error shown via prop */}
    finally { setBusy(false); }
  };

  const errMsg = !error ? null
    : error.includes("invalid-credential") || error.includes("wrong-password") || error.includes("user-not-found")
      ? "Email oder Passwort falsch"
      : error.includes("too-many-requests") ? "Zu viele Versuche – kurz warten"
      : error.includes("network") ? "Netzwerkfehler"
      : error;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: `radial-gradient(ellipse at top, #1a1c25 0%, ${L_C.bg} 50%, #08090c 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      color: L_C.text, position: "relative", overflow: "hidden",
    }}>
      {/* ambient blobs */}
      <div style={{
        position: "absolute", left: "20%", top: "20%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%)",
        filter: "blur(60px)", pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", right: "15%", bottom: "10%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
        filter: "blur(60px)", pointerEvents: "none",
      }}/>

      <form onSubmit={submit} style={{
        width: 360, padding: 32,
        background: `linear-gradient(180deg, ${L_C.surfaceHi}, ${L_C.surface})`,
        border: `1px solid ${L_C.borderHi}`, borderRadius: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${L_C.accent}, #c2410c)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(249,115,22,0.4)",
          }}>
            <svg width={18} height={18} viewBox="0 0 16 16">
              <path d="M2 8 L8 2 L14 8 L8 14 Z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>PEGASUS</div>
            <div style={{ fontSize: 10, color: L_C.text3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.2 }}>TIMELINE · SIGN IN</div>
          </div>
        </div>

        {!enabled ? (
          <div style={{
            padding: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 6, fontSize: 12, color: L_C.danger, lineHeight: 1.5,
          }}>
            Firebase ist nicht konfiguriert. Setze <code>ENABLE_FIREBASE = true</code> und
            ergänze deine Config in <code>firebase-config.js</code>.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={lblStyle}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                autoFocus required style={inpStyle} placeholder="dein.name@projekt.ch"/>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={lblStyle}>PASSWORD</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                required style={inpStyle} placeholder="••••••••"/>
            </div>
            {errMsg && (
              <div style={{
                padding: "8px 12px", marginBottom: 14,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 6, fontSize: 12, color: L_C.danger,
              }}>{errMsg}</div>
            )}
            <button type="submit" disabled={busy || !email || !pw} style={{
              width: "100%", padding: "11px 16px", borderRadius: 8,
              border: "none", cursor: busy ? "wait" : "pointer",
              background: busy ? L_C.text3 : `linear-gradient(135deg, ${L_C.accent}, #c2410c)`,
              color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
              fontFamily: "inherit",
              boxShadow: busy ? "none" : "0 4px 12px rgba(249,115,22,0.3)",
              transition: "all 0.15s",
            }}>{busy ? "Signing in…" : "Sign In"}</button>
            <div style={{
              marginTop: 18, fontSize: 10, color: L_C.text3, lineHeight: 1.6,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
            }}>
              Accounts werden vom Admin in der Firebase-Console erstellt.<br/>
              No registration · Contact owner for access.
            </div>
          </>
        )}
      </form>
    </div>
  );
}

const lblStyle = {
  display: "block", fontSize: 9, color: L_C.text3,
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, fontWeight: 700,
  marginBottom: 6,
};
const inpStyle = {
  width: "100%", padding: "10px 12px", boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)", border: `1px solid ${L_C.border}`,
  borderRadius: 6, color: L_C.text, fontSize: 13,
  fontFamily: "inherit", outline: "none",
};

Object.assign(window, { LoginScreen });
