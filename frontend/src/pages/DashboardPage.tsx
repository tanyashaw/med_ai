import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Analytics, Case } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Err, Loading, StatusBadge } from "../components/Layout";

/* ── SVG bar chart ────────────────────────────────────────────────────────── */
function BarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const W = 400;
  const H = 120;
  const barW = Math.min(48, (W - 40) / entries.length - 8);
  const gap = (W - 40) / entries.length;

  const colors: Record<string, string> = {
    draft: "#94a3b8",
    documents: "#38bdf8",
    extracted: "#818cf8",
    analyzed: "#1aa8a8",
    in_review: "#f59e0b",
    decided: "#10b981",
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: "100%", maxWidth: W }}>
      {entries.map(([status, count], i) => {
        const x = 20 + i * gap + gap / 2 - barW / 2;
        const barH = Math.max(4, (count / max) * H);
        const y = H - barH;
        const fill = colors[status] || "#94a3b8";
        return (
          <g key={status}>
            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx={4} opacity={0.85} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {status.replace("_", " ")}
            </text>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="600" fill={fill}>
              {count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.cases().then((d) => setCases(d as Case[])).catch(() => setCases([])),
      user && user.role !== "staff"
        ? api.analytics().then((d) => setStats(d as Analytics)).catch(() => {})
        : Promise.resolve(),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Loading />;
  if (error) return <Err message={error} />;

  return (
    <div>
      {/* Sleek Hero Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(13, 143, 143, 0.15))",
          border: "1px solid rgba(26, 168, 168, 0.25)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(26, 168, 168, 0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
              Clinical Decision Platform
            </h1>
            <p style={{ color: "var(--slate-400)", fontSize: 13.5, maxWidth: 620 }}>
              Patient intake, clinical document analysis, and decision support platform.
            </p>
          </div>
          <Link
            to="/cases/new"
            className="btn btn-primary btn-lg"
            id="new-case-btn"
            style={{
              boxShadow: "0 0 20px rgba(13, 143, 143, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>+</span> Create New Case
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
          <div className="stat-card stat-card__teal card-glow">
            <div className="stat-card__label">Total Cases</div>
            <div className="stat-card__value">{Object.values(stats.cases_by_status).reduce((a, b) => a + b, 0)}</div>
          </div>
          <div className="stat-card card-glow">
            <div className="stat-card__label">Documents Intake</div>
            <div className="stat-card__value">{stats.document_count}</div>
          </div>
          <div className="stat-card card-glow">
            <div className="stat-card__label">AI Extractions</div>
            <div className="stat-card__value">{stats.analysis_count}</div>
          </div>
          <div className="stat-card card-glow">
            <div className="stat-card__label">Clinical Reports</div>
            <div className="stat-card__value">{stats.report_count}</div>
          </div>
          <div className="stat-card card-glow">
            <div className="stat-card__label">Active Reviewers</div>
            <div className="stat-card__value">{stats.user_count}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {stats && Object.keys(stats.cases_by_status).length > 0 && (
        <div className="card" style={{ marginBottom: 24, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cases by Status</h2>
          <BarChart data={stats.cases_by_status} />
        </div>
      )}

      {/* Cases table */}
      <div className="table-wrap">
        <div className="card__header">
          <span className="card__title">Recent Cases</span>
          <Link to="/cases" style={{ fontSize: 12, color: "var(--teal-600)" }}>View all →</Link>
        </div>
        <table className="table" id="cases-table">
          <thead>
            <tr>
              <th>Case / Claim</th>
              <th>Patient</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.slice(0, 10).map((item) => (
              <tr key={item.id}>
                <td>
                  <Link className="table-link" to={`/cases/${item.id}`}>
                    {item.title}
                  </Link>
                  {item.claim_number && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      #{item.claim_number}
                    </div>
                  )}
                </td>
                <td>
                  {item.patient.first_name} {item.patient.last_name}
                </td>
                <td style={{ textTransform: "capitalize" }}>{item.case_type}</td>
                <td><StatusBadge status={item.status} /></td>
                <td className="text-muted text-xs">{new Date(item.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state__title">No cases yet</div>
                    <div className="empty-state__text">Create your first case to get started.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
