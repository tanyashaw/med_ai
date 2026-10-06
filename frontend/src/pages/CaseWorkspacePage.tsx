import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Analysis, Case, Document } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ConfBar, Err, Loading, StatusBadge } from "../components/Layout";

const TABS = ["overview", "documents", "analysis", "notes", "report"] as const;
type Tab = (typeof TABS)[number];

export function CaseWorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<Case | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("approve");
  const [comments, setComments] = useState("");

  async function reload() {
    if (!id) return;
    const data = (await api.getCase(id)) as Case;
    setItem(data);
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message));
  }, [id]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError("");
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy("");
    }
  }

  if (!item) return error ? <Err message={error} /> : <Loading text="Loading case…" />;
  const canDecide = user && user.role !== "staff";

  return (
    <div>
      {/* Case header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link to="/cases" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
              ← Cases
            </Link>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{item.title}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {item.patient.first_name} {item.patient.last_name}
            </span>
            {item.claim_number && (
              <span className="chip chip-slate">Claim #{item.claim_number}</span>
            )}
            <span className="chip chip-slate" style={{ textTransform: "capitalize" }}>{item.case_type}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {item.latest_report && id && (
              <a
                href={`/api/cases/${id}/report/pdf?token=${localStorage.getItem("medai_token") || ""}`}
                className="btn btn-primary btn-sm"
                download={`report_${id}.pdf`}
              >
                Download PDF Report
              </a>
            )}
            <StatusBadge status={item.status} />
          </div>
          {item.latest_analysis && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              AI confidence: {Math.round((item.latest_analysis.overall_confidence || 0) * 100)}%
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((name) => (
          <button
            key={name}
            id={`tab-${name}`}
            className={`tab-btn${tab === name ? " active" : ""}`}
            onClick={() => setTab(name)}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
            {name === "documents" && item.documents.length > 0 && (
              <span style={{
                marginLeft: 5, background: "var(--teal-600)", color: "#fff",
                borderRadius: 999, padding: "0 6px", fontSize: 10, fontWeight: 700
              }}>{item.documents.length}</span>
            )}
            {name === "notes" && item.notes.length > 0 && (
              <span style={{
                marginLeft: 5, background: "var(--slate-400)", color: "#fff",
                borderRadius: 999, padding: "0 6px", fontSize: 10, fontWeight: 700
              }}>{item.notes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid-2">
          <Card title="Patient Demographics">
            <KV label="Full name" value={`${item.patient.first_name} ${item.patient.last_name}`} />
            <KV label="DOB" value={item.patient.date_of_birth} />
            <KV label="Sex" value={item.patient.sex} />
            <KV label="Phone" value={item.patient.phone} />
            <KV label="Email" value={item.patient.email} />
            <KV label="Address" value={item.patient.address} />
          </Card>
          <Card title="Clinical Information">
            {item.patient.medical_history && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                {item.patient.medical_history}
              </p>
            )}
            <div className="mb-2">
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>SYMPTOMS</div>
              <TagList items={item.symptoms} empty="None recorded" />
            </div>
            <div className="mb-2">
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>DIAGNOSES</div>
              <TagList items={item.diagnoses} empty="None recorded" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>TREATMENTS</div>
              <TagList items={item.treatments} empty="None recorded" />
            </div>
          </Card>
          <Card title="Case Timeline">
            <KV label="Created" value={new Date(item.created_at).toLocaleString()} />
            <KV label="Updated" value={new Date(item.updated_at).toLocaleString()} />
            <KV label="Status" value={item.status.replace(/_/g, " ")} />
            <KV label="Documents" value={String(item.documents.length)} />
          </Card>
        </div>
      )}

      {/* ── Documents ───────────────────────────────────────────────────── */}
      {tab === "documents" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Documents</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>
                PDF, PNG, JPG, TXT (max 15 MB) accepted
              </span>
              <label className="btn btn-primary btn-upload" id="upload-btn">
                {busy === "upload" ? <><span className="spinner" /> Uploading…</> : "Upload Document"}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && id) run("upload", () => api.upload(id, file));
                  }}
                />
              </label>
            </div>
          </div>

          {item.documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No documents uploaded</div>
              <div className="empty-state__text">Upload medical records, lab reports, imaging, or prescriptions.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {item.documents.map((doc) => <DocCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Analysis ────────────────────────────────────────────────────── */}
      {tab === "analysis" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
            {canDecide ? (
              <button
                id="run-analysis-btn"
                className="btn btn-primary"
                disabled={busy === "analyze"}
                onClick={() => id && run("analyze", () => api.analyze(id))}
              >
                {busy === "analyze" ? <><span className="spinner" /> Analyzing…</> : "🔬 Run AI Analysis"}
              </button>
            ) : (
              <div className="alert alert-warning" style={{ fontSize: 12 }}>
                Only doctors, reviewers, and admins can run analysis.
              </div>
            )}
          </div>

          <div className="alert alert-warning mb-4" style={{ fontSize: 12 }}>
            ⚠ AI analysis is decision support only. All findings require independent clinical verification.
          </div>

          {item.latest_analysis ? (
            <AnalysisPanel analysis={item.latest_analysis} />
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">🔬</div>
              <div className="empty-state__title">No analysis yet</div>
              <div className="empty-state__text">
                Upload documents and run AI analysis to see clinical findings, diagnoses, and recommendations.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      {tab === "notes" && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Case Notes</h2>

          {item.notes.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 24 }}>
              <div className="empty-state__icon">💬</div>
              <div className="empty-state__title">No notes yet</div>
              <div className="empty-state__text">Add timestamped clinical notes below.</div>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {item.notes.map((n) => (
                <div key={n.id} className="card" style={{ padding: "12px 16px" }}>
                  <p style={{ fontSize: 13.5 }}>{n.body}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleString()}
                    {n.user_id && " · by team member"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Card title="Add Note">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!id || !note.trim()) return;
                run("note", async () => {
                  await api.addNote(id, note);
                  setNote("");
                });
              }}
            >
              <textarea
                id="note-textarea"
                className="form-control"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Clinical observation, review note, or follow-up action…"
                style={{ marginBottom: 10 }}
              />
              <button id="add-note-btn" type="submit" className="btn btn-primary" disabled={busy === "note" || !note.trim()}>
                {busy === "note" ? <><span className="spinner" /> Saving…</> : "Add Note"}
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Report ──────────────────────────────────────────────────────── */}
      {tab === "report" && (
        <div>
          {canDecide ? (
            <Card title="Record Decision" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label className="form-label">Decision</label>
                  <select id="decision-select" className="form-control" value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="approve">✅ Approve</option>
                    <option value="deny">❌ Deny</option>
                    <option value="request_info">📋 Request Information</option>
                    <option value="refer">↩ Refer</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                  <label className="form-label">Comments</label>
                  <input
                    id="decision-comments"
                    className="form-control"
                    placeholder="Decision rationale…"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
                <button
                  id="record-decision-btn"
                  className="btn btn-primary"
                  disabled={busy === "decide"}
                  onClick={() => id && run("decide", () => api.decide(id, decision, comments))}
                >
                  {busy === "decide" ? <><span className="spinner" /> Saving…</> : "Record Decision"}
                </button>
              </div>
              <div className="alert alert-warning mt-4" style={{ fontSize: 12 }}>
                This decision will be recorded in the audit log and a downloadable PDF report will be generated.
              </div>
            </Card>
          ) : (
            <div className="alert alert-warning mb-6" style={{ fontSize: 13 }}>
              Staff can view and upload documents, but cannot finalize clinical decisions.
            </div>
          )}

          {item.latest_report ? (
            <Card title="Latest Decision Report">
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                <DecisionBadge decision={item.latest_report.decision} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(item.latest_report.created_at).toLocaleString()}
                </span>
                {id && (
                  <a
                    id="download-report-btn"
                    href={`/api/cases/${id}/report/pdf?token=${localStorage.getItem("medai_token") || ""}`}
                    className="btn btn-primary"
                    download={`report_${id}.pdf`}
                    style={{ marginLeft: "auto" }}
                  >
                    Download PDF Report
                  </a>
                )}
              </div>
              {item.latest_report.comments && (
                <p style={{ fontSize: 13, marginBottom: 12, color: "var(--text-muted)" }}>
                  {item.latest_report.comments}
                </p>
              )}
            </Card>
          ) : (
            <div className="empty-state">
              <div className="empty-state__title">No report yet</div>
              <div className="empty-state__text">Run analysis and record a decision to generate a PDF report.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Analysis Panel ───────────────────────────────────────────────────────── */
function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary + Confidence */}
      <Card title="Summary">
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{analysis.summary}</p>
        {analysis.overall_confidence > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>OVERALL CONFIDENCE</div>
            <ConfBar value={analysis.overall_confidence} />
          </div>
        )}
      </Card>

      <div className="grid-2">
        {/* Diagnoses */}
        {analysis.diagnoses.length > 0 && (
          <Card title="Diagnoses">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analysis.diagnoses.map((d: any, i: number) => (
                <div key={i} className="finding-item">
                  <div className="finding-item__name">{d.name || d}</div>
                  <div className="finding-item__meta">
                    {d.icd10 && <span className="chip chip-slate">ICD-10: {d.icd10}</span>}
                    {d.confidence != null && (
                      <span className="chip chip-teal">{Math.round(d.confidence * 100)}% confidence</span>
                    )}
                  </div>
                  {d.source && (
                    <div className="source-ref" title={d.source.excerpt}>
                      📄 {d.source.document} — "{d.source.excerpt?.slice(0, 60)}…"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Medications */}
        {analysis.medications.length > 0 && (
          <Card title="Medications">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analysis.medications.map((m: any, i: number) => (
                <div key={i} className="finding-item">
                  <div className="finding-item__name">{m.name || m}</div>
                  <div className="finding-item__meta">
                    {m.dose && <span className="chip chip-slate">{m.dose}</span>}
                    {m.frequency && <span className="chip chip-teal">{m.frequency}</span>}
                  </div>
                  {m.source && (
                    <div className="source-ref" title={m.source.excerpt}>
                      📄 {m.source.document} — "{m.source.excerpt?.slice(0, 60)}…"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Procedures */}
        {analysis.procedures.length > 0 && (
          <Card title="Procedures">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analysis.procedures.map((p: any, i: number) => (
                <div key={i} className="finding-item">
                  <div className="finding-item__name">{p.name || p}</div>
                  {p.source && (
                    <div className="source-ref" title={p.source.excerpt}>
                      📄 {p.source.document} — "{p.source.excerpt?.slice(0, 60)}…"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Key Findings */}
        {analysis.key_findings.length > 0 && (
          <Card title="Key Findings">
            <BulletList items={analysis.key_findings} />
          </Card>
        )}

        {/* Risk Flags */}
        {analysis.risk_flags.length > 0 && (
          <Card title="⚠ Risk Flags">
            <BulletList items={analysis.risk_flags} chipClass="chip-rose" />
          </Card>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <Card title="Recommendations">
            <BulletList items={analysis.recommendations} chipClass="chip-teal" />
          </Card>
        )}

        {/* Missing Info */}
        {analysis.missing_information.length > 0 && (
          <Card title="Missing / Unclear Information">
            <BulletList items={analysis.missing_information} chipClass="chip-amber" />
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function Card({ title, children, style }: { title: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      <div className="card__header"><span className="card__title">{title}</span></div>
      <div className="card__body">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{value || "—"}</span>
    </div>
  );
}

function TagList({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{empty || "—"}</span>;
  return (
    <div className="tag-list">
      {items.map((t) => <span key={t} className="tag">{t}</span>)}
    </div>
  );
}

function BulletList({ items, chipClass }: { items: string[]; chipClass?: string }) {
  return (
    <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ color: "var(--teal-500)", fontSize: 12, marginTop: 2 }}>▸</span>
          <span className={chipClass ? `chip ${chipClass}` : ""} style={{ fontSize: 13 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DocCard({ doc }: { doc: Document }) {
  const typeLabel: Record<string, string> = {
    lab_report: "🧪 Lab Report", discharge_summary: "🏥 Discharge Summary",
    imaging_report: "📷 Imaging", prescription: "💊 Prescription",
    clinical_note: "📝 Clinical Note", insurance_form: "📄 Insurance Form",
    referral: "↩ Referral", pathology_report: "🔬 Pathology", other: "📋 Document",
  };
  return (
    <div className="doc-card">
      <div className="doc-card__header">
        <span className="doc-card__filename">{doc.filename}</span>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {doc.doc_type && (
            <span className="chip chip-teal">{typeLabel[doc.doc_type] || doc.doc_type}</span>
          )}
          <a
            href={`/api/documents/${doc.id}/file?token=${localStorage.getItem("medai_token") || ""}`}
            className="btn btn-ghost btn-sm"
            download={doc.filename}
          >
            ⬇
          </a>
        </div>
      </div>
      {doc.entities && Object.keys(doc.entities).some(k => Array.isArray((doc.entities as any)[k]) && (doc.entities as any)[k].length) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {Object.entries(doc.entities).flatMap(([k, vs]) =>
            Array.isArray(vs)
              ? (vs as any[]).slice(0, 3).map((v: any, i: number) => (
                  <span key={`${k}-${i}`} className="chip chip-slate" style={{ fontSize: 10 }}>
                    {typeof v === "object" ? v.name : v}
                  </span>
                ))
              : []
          )}
        </div>
      )}
      {doc.extracted_text && (
        <div className="doc-card__text">{doc.extracted_text.slice(0, 500)}{doc.extracted_text.length > 500 && "…"}</div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
        {doc.content_type} · {new Date(doc.created_at).toLocaleString()}
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const styles: Record<string, string> = {
    approve: "chip chip-teal",
    deny: "chip chip-rose",
    request_info: "chip chip-amber",
    refer: "chip chip-slate",
  };
  const labels: Record<string, string> = {
    approve: "✅ Approved", deny: "❌ Denied",
    request_info: "📋 Info Requested", refer: "↩ Referred",
  };
  return <span className={styles[decision] || "chip chip-slate"}>{labels[decision] || decision}</span>;
}
