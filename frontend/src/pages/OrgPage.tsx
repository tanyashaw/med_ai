import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Organization } from "../api/types";
import { Err, Loading } from "../components/Layout";

export function OrgPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.org()
      .then((data) => {
        const o = data as Organization;
        setOrg(o);
        setName(o.name);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = (await api.updateOrg(name)) as Organization;
      setOrg(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (!org) return <Err message={error || "Organization not found"} />;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1>Organization</h1>
          <p>Manage your organization's profile and settings.</p>
        </div>
      </div>

      {error && <Err message={error} />}

      <div className="card mb-6">
        <div className="card__header">
          <span className="card__title">Organization Details</span>
          <span className="chip chip-slate" style={{ fontSize: 11, fontFamily: "monospace" }}>
            ID: {org.id.slice(0, 8)}…
          </span>
        </div>
        <div className="card__body">
          <form id="org-form" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="org-name">Organization Name</label>
              <input
                id="org-name"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Created</label>
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
                {new Date(org.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                id="save-org-btn"
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
              </button>
              {saved && (
                <span className="chip chip-teal">✓ Saved</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Compliance note */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--amber-600)" }}>
          ⚠ Compliance Notice
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
          This MVP platform is intended for evaluation and development purposes only. Before processing real 
          patient data, consult your legal and compliance team to ensure HIPAA compliance (US) or GDPR 
          compliance (EU). Required steps include: Business Associate Agreement (BAA) with cloud provider, 
          data encryption at rest and in transit, access controls and audit logging review, and a formal 
          risk assessment. The AI analysis outputs are decision support only and must never replace 
          professional clinical judgment.
        </p>
      </div>
    </div>
  );
}
