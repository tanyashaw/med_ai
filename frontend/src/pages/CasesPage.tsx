import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Case } from "../api/types";
import { Err, Loading, StatusBadge } from "../components/Layout";

export function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    api.cases(params.toString())
      .then((d) => { setCases(Array.isArray(d) ? (d as Case[]) : []); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Failed to load cases"); setLoading(false); });
  }, [search, status]);

  function setFilter(key: string, val: string) {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1>Cases</h1>
          <p>Search, filter and manage patient cases and insurance claims.</p>
        </div>
        <Link to="/cases/new" className="btn btn-primary">+ New Case</Link>
      </div>

      <div className="filter-bar">
        <input
          id="cases-search"
          type="search"
          className="form-control"
          placeholder="Search name, title, claim #…"
          defaultValue={search}
          onKeyDown={(e) => e.key === "Enter" && setFilter("search", (e.target as HTMLInputElement).value)}
          onBlur={(e) => setFilter("search", e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          id="cases-status-filter"
          className="form-control"
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="documents">Documents</option>
          <option value="extracted">Extracted</option>
          <option value="analyzed">Analyzed</option>
          <option value="in_review">In Review</option>
          <option value="decided">Decided</option>
        </select>
        {(search || status) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>
            Clear filters
          </button>
        )}
      </div>

      {loading && <Loading />}
      {error && <Err message={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="table" id="cases-list-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="table-link" to={`/cases/${item.id}`}>
                      {item.title}
                    </Link>
                  </td>
                  <td>
                    {item.patient.first_name} {item.patient.last_name}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{item.case_type}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td className="text-muted">{item.documents.length}</td>
                  <td className="text-muted text-xs">{new Date(item.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state__title">No cases found</div>
                      <div className="empty-state__text">
                        {search || status ? "Try adjusting your filters." : "Create a new case to get started."}
                      </div>
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
