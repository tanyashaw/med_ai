import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AuditLog, User } from "../api/types";
import { Err, Loading } from "../components/Layout";

const ACTION_COLORS: Record<string, string> = {
  login: "chip-teal",
  create_case: "chip-teal",
  view_case: "chip-slate",
  update_case: "chip-amber",
  delete_case: "chip-rose",
  upload_document: "chip-teal",
  download_document: "chip-slate",
  download_report: "chip-slate",
  run_extraction: "chip-amber",
  run_analysis: "chip-amber",
  submit_review: "chip-amber",
  decide_case: "chip-rose",
  create_user: "chip-teal",
  update_user: "chip-amber",
  update_organization: "chip-amber",
  add_note: "chip-slate",
};

export function AdminAuditPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (userId) params.set("user_id", userId);
    if (action) params.set("action", action);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("limit", "200");

    api.audit(params.toString())
      .then((d) => setRows(Array.isArray(d) ? (d as AuditLog[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.users().then((d) => setUsers(d as User[])).catch(() => {});
    load();
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1>Audit Log</h1>
          <p>Complete trail of all user actions within your organization.</p>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rows.length} records shown</div>
      </div>

      {error && <Err message={error} />}

      {/* Filter form */}
      <form id="audit-filters" onSubmit={applyFilters}>
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <select
            id="audit-user-filter"
            className="form-control"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
            ))}
          </select>

          <input
            id="audit-action-filter"
            className="form-control"
            placeholder="Filter by action…"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ maxWidth: 200 }}
          />

          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <label className="form-label" style={{ whiteSpace: "nowrap", marginBottom: 0 }}>From</label>
            <input
              id="audit-date-from"
              type="date"
              className="form-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: 150 }}
            />
          </div>

          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <label className="form-label" style={{ whiteSpace: "nowrap", marginBottom: 0 }}>To</label>
            <input
              id="audit-date-to"
              type="date"
              className="form-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: 150 }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">Apply</button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setUserId(""); setAction(""); setDateFrom(""); setDateTo(""); }}
          >
            Clear
          </button>
        </div>
      </form>

      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table className="table" id="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const userName = users.find((u) => u.id === row.user_id)?.full_name || row.user_id?.slice(0, 8) || "—";
                return (
                  <tr key={row.id}>
                    <td className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13 }}>{userName}</td>
                    <td>
                      <span className={`chip ${ACTION_COLORS[row.action] || "chip-slate"}`} style={{ fontSize: 11 }}>
                        {row.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {row.resource_type}
                      {row.resource_id && <span style={{ fontFamily: "monospace", marginLeft: 4 }}>#{row.resource_id.slice(0, 8)}</span>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-state__title">No audit events found</div>
                      <div className="empty-state__text">Try adjusting the filters or perform actions to generate log entries.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
