import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Err } from "../components/Layout";

function splitList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

type FormState = {
  title: string;
  case_type: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  medical_history: string;
  symptoms: string;
  diagnoses: string;
  treatments: string;
};

const INITIAL: FormState = {
  title: "",
  case_type: "patient",
  first_name: "",
  last_name: "",
  date_of_birth: "",
  sex: "",
  phone: "",
  email: "",
  address: "",
  medical_history: "",
  symptoms: "",
  diagnoses: "",
  treatments: "",
};

export function NewCasePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [files, setFiles] = useState<File[]>([]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = (await api.createCase({
        title: form.title,
        case_type: form.case_type,
        symptoms: splitList(form.symptoms),
        diagnoses: splitList(form.diagnoses),
        treatments: splitList(form.treatments),
        patient: {
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth || null,
          sex: form.sex || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          medical_history: form.medical_history || null,
        },
      })) as { id: string };

      if (files.length > 0) {
        for (const file of files) {
          await api.upload(created.id, file);
        }
      }

      navigate(`/cases/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create case");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 40px" }}>
      <div className="page-header" style={{ textAlign: "center", display: "block", marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create New Case</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>
          Fill in patient demographics and clinical details to start a case.
        </p>
      </div>

      {error && <Err message={error} />}

      <form id="new-case-form" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Case Info */}
        <div className="card card-glow">
          <div className="card__header"><span className="card__title">Case Information</span></div>
          <div className="card__body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="case-title">Case Title *</label>
                <input
                  id="case-title"
                  className="form-control"
                  placeholder="e.g. Knee MRI Evaluation"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="case-type">Case Type</label>
                <select
                  id="case-type"
                  className="form-control"
                  value={form.case_type}
                  onChange={(e) => set("case_type", e.target.value)}
                >
                  <option value="patient">Patient</option>
                  <option value="claim">Insurance Claim</option>
                  <option value="referral">Referral</option>
                  <option value="pre_auth">Pre-Authorization</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="card card-glow">
          <div className="card__header"><span className="card__title">Patient Demographics</span></div>
          <div className="card__body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="first-name">First Name *</label>
                <input
                  id="first-name"
                  className="form-control"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="last-name">Last Name *</label>
                <input
                  id="last-name"
                  className="form-control"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="date-of-birth">Date of Birth</label>
                <input
                  id="date-of-birth"
                  type="date"
                  className="form-control"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sex">Sex</label>
                <select
                  id="sex"
                  className="form-control"
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-email">Email</label>
                <input
                  id="patient-email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="address">Address</label>
                <input
                  id="address"
                  className="form-control"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="medical-history">Medical History</label>
                <textarea
                  id="medical-history"
                  className="form-control"
                  rows={4}
                  placeholder="Relevant past conditions, surgeries, allergies…"
                  value={form.medical_history}
                  onChange={(e) => set("medical_history", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div className="card card-glow">
          <div className="card__header"><span className="card__title">Clinical Details</span></div>
          <div className="card__body">
            <p className="text-muted text-sm mb-4">Enter comma-separated values. These can be updated later.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="symptoms">Symptoms</label>
                <input
                  id="symptoms"
                  className="form-control"
                  placeholder="e.g. knee pain, swelling, limited range of motion"
                  value={form.symptoms}
                  onChange={(e) => set("symptoms", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="diagnoses">Known Diagnoses</label>
                <input
                  id="diagnoses"
                  className="form-control"
                  placeholder="e.g. osteoarthritis, hypertension"
                  value={form.diagnoses}
                  onChange={(e) => set("diagnoses", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="treatments">Previous Treatments / Procedures</label>
                <input
                  id="treatments"
                  className="form-control"
                  placeholder="e.g. physical therapy, cortisone injection"
                  value={form.treatments}
                  onChange={(e) => set("treatments", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Documents Upload */}
        <div className="card card-glow">
          <div className="card__header"><span className="card__title">Upload Medical Documents (Optional)</span></div>
          <div className="card__body">
            <p className="text-muted text-sm mb-3">Attach clinical notes, lab reports, MRI scans, or medical records (PDF, PNG, JPG, TXT).</p>
            <input
              id="case-files"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="form-control"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles(Array.from(e.target.files));
                }
              }}
            />
            {files.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <p className="text-xs text-muted" style={{ fontWeight: 600, marginBottom: 4 }}>{files.length} file(s) attached:</p>
                {files.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-color)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 12px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{f.name} <span style={{ color: "var(--text-muted)" }}>({(f.size / 1024).toFixed(1)} KB)</span></span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      style={{ padding: "2px 8px", fontSize: 11 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
          <button
            id="create-case-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={busy}
            style={{ minWidth: 180, justifyContent: "center" }}
          >
            {busy ? <><span className="spinner" /> Creating…</> : "Create Case →"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => navigate("/cases")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
