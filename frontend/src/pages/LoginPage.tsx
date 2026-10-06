import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@medai.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="login-page"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(13, 143, 143, 0.25) 0%, rgba(8, 15, 30, 0.98) 70%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        className="login-card"
        id="login-form"
        style={{
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(26, 168, 168, 0.3)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(13, 143, 143, 0.15)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 36px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--teal-400)",
            background: "rgba(26, 168, 168, 0.12)",
            padding: "3px 10px",
            borderRadius: 999,
            marginBottom: 16,
            border: "1px solid rgba(26, 168, 168, 0.3)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#1aa8a8",
              boxShadow: "0 0 8px #1aa8a8",
            }}
          />
          AI Medical Decision Platform
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(13, 143, 143, 0.4)",
            }}
          >
            M
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>MedAI</h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Next-Gen Clinical & Claim Intelligence</p>
          </div>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full btn-lg"
          style={{
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(13, 143, 143, 0.4)",
            fontWeight: 600,
          }}
        >
          {busy ? <><span className="spinner" /> Signing in…</> : "Sign in →"}
        </button>

        <div className="sep" style={{ background: "rgba(255,255,255,0.08)" }} />

        <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "center", lineHeight: 1.5 }}>
          Demo accounts (click to pre-fill):
        </p>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { email: "admin@medai.local", role: "Admin", pwd: "Admin123!" },
            { email: "doctor@medai.local", role: "Doctor", pwd: "Doctor123!" },
            { email: "reviewer@medai.local", role: "Reviewer", pwd: "Review123!" },
            { email: "staff@medai.local", role: "Staff", pwd: "Staff123!" },
          ].map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => {
                setEmail(u.email);
                setPassword(u.pwd);
              }}
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 8,
                padding: "6px 10px",
                color: "rgba(255,255,255,.6)",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(26,168,168,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              <strong style={{ color: "var(--teal-400)" }}>{u.role}</strong>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
