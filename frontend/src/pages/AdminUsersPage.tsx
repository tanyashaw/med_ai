import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";
import { Err, Loading } from "../components/Layout";

const ROLE_COLORS: Record<string, string> = {
  admin: "chip chip-rose",
  doctor: "chip chip-teal",
  insurance_reviewer: "chip chip-amber",
  staff: "chip chip-slate",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "staff" });

  function load() {
    setLoading(true);
    api.users()
      .then((data) => setUsers(data as User[]))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createUser(form);
      setForm({ email: "", password: "", full_name: "", role: "staff" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changeRole(u: User, role: string) {
    try {
      await api.updateUser(u.id, { role });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1>Team Members</h1>
          <p>Manage users, roles, and access within your organization.</p>
        </div>
      </div>

      {error && <Err message={error} />}

      {/* Create user form */}
      <div className="card mb-6">
        <div className="card__header">
          <span className="card__title">Add Team Member</span>
        </div>
        <div className="card__body">
          <form id="create-user-form" onSubmit={onSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  id="user-full-name"
                  className="form-control"
                  placeholder="Jane Doe"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  id="user-email"
                  type="email"
                  className="form-control"
                  placeholder="jane@clinic.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  id="user-password"
                  type="password"
                  className="form-control"
                  placeholder="Min 8 chars"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  id="user-role"
                  className="form-control"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="insurance_reviewer">Insurance Reviewer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            <button id="create-user-btn" type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <><span className="spinner" /> Adding…</> : "+ Add Member"}
            </button>
          </form>
        </div>
      </div>

      {/* Users table */}
      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table className="table" id="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ padding: "3px 8px", fontSize: 12, width: "auto" }}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="insurance_reviewer">Ins. Reviewer</option>
                      <option value="staff">Staff</option>
                    </select>
                  </td>
                  <td>
                    <span className={u.is_active ? "badge badge-analyzed" : "badge badge-draft"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-secondary"}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role guide */}
      <div className="card mt-6" style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Role Permissions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10 }}>
          {[
            { role: "admin", perms: "Full access: users, audit, delete, all actions" },
            { role: "doctor", perms: "Run analysis, review, decide cases" },
            { role: "insurance_reviewer", perms: "Run analysis, review, decide cases" },
            { role: "staff", perms: "Create cases, upload documents, add notes" },
          ].map(({ role, perms }) => (
            <div key={role} style={{ fontSize: 12 }}>
              <span className={ROLE_COLORS[role] || "chip chip-slate"} style={{ display: "inline-block", marginBottom: 4 }}>
                {role.replace("_", " ")}
              </span>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{perms}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
