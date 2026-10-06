import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div
      style={{
        background: "var(--slate-950)",
        color: "var(--slate-100)",
        minHeight: "100vh",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* ── Top Navigation ────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(16px)",
          background: "rgba(8, 15, 30, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "16px 32px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                boxShadow: "0 0 16px rgba(13, 143, 143, 0.4)",
              }}
            >
              M
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
              Med<span style={{ color: "var(--teal-400)" }}>AI</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ boxShadow: "0 0 16px rgba(13, 143, 143, 0.4)", padding: "8px 22px", fontSize: 13, fontWeight: 600 }}
            >
              Login →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "100px 24px 80px",
          textAlign: "center",
          overflow: "hidden",
          background: "radial-gradient(ellipse at 50% 20%, rgba(13, 143, 143, 0.2) 0%, rgba(8, 15, 30, 1) 75%)",
        }}
      >
        {/* Background Mesh */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 800,
            background: "radial-gradient(circle, rgba(26, 168, 168, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 880, margin: "0 auto", position: "relative", zIndex: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--teal-400)",
              background: "rgba(26, 168, 168, 0.12)",
              padding: "6px 16px",
              borderRadius: 999,
              marginBottom: 24,
              border: "1px solid rgba(26, 168, 168, 0.3)",
              boxShadow: "0 0 20px rgba(13, 143, 143, 0.2)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1aa8a8", boxShadow: "0 0 8px #1aa8a8" }} />
            Next-Gen AI Platform for Clinical & Pre-Auth Decisions
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              marginBottom: 20,
              background: "linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Automate Medical Document Intake & Clinical Pre-Authorizations
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "var(--slate-400)",
              lineHeight: 1.6,
              maxWidth: 680,
              margin: "0 auto 36px",
            }}
          >
            MedAI converts complex clinical notes, MRI scans, and lab reports into structured AI insights. Accelerating insurance decisions while empowering doctors with full review controls.
          </p>



          {/* Metrics Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
              marginTop: 70,
              padding: "24px 32px",
              background: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(12px)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--teal-400)" }}>&lt; 0.9s</div>
              <div style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>AI Processing Latency</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>99.4%</div>
              <div style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>Clinical Extraction Accuracy</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--teal-400)" }}>100%</div>
              <div style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>Audit Verified Logs</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solutions by Role Section ────────────────────────────────────── */}
      <section id="solutions" style={{ padding: "90px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
            Tailored for Every Healthcare Stakeholder
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { role: "Doctors & Clinicians", desc: "Instant clinical entity extraction with full manual override authority." },
            { role: "Insurance Reviewers", desc: "Accelerated pre-authorization approval workflows and PDF summary exports." },
            { role: "Practice Staff", desc: "Seamless patient intake and multi-file document upload management." },
            { role: "Administrators", desc: "Role-based access control (RBAC) and immutable compliance audit logs." },
          ].map((item, idx) => (
            <div
              key={idx}
              className="card-glow"
              style={{
                padding: 24,
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--teal-400)", marginBottom: 8 }}>{item.role}</div>
              <div style={{ fontSize: 13, color: "var(--slate-400)", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "40px 24px",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(8, 15, 30, 0.95)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--slate-500)" }}>
          MedAI Clinical Decision Platform • Powered by Groq AI • All rights reserved
        </div>
      </footer>
    </div>
  );
}
