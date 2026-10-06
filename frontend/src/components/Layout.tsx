import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  AuditLogIcon,
  CasesIcon,
  DashboardIcon,
  LogoutIcon,
  NewCaseIcon,
  OrganizationIcon,
  TeamIcon,
} from "./Icons";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/cases", label: "Cases", Icon: CasesIcon },
  { to: "/cases/new", label: "New Case", Icon: NewCaseIcon },
];

const ADMIN_ITEMS = [
  { to: "/admin/users", label: "Team", Icon: TeamIcon },
  { to: "/admin/audit", label: "Audit Log", Icon: AuditLogIcon },
  { to: "/admin/org", label: "Organization", Icon: OrganizationIcon },
];

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const routeLabel = (() => {
    if (location.pathname === "/" || location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname.startsWith("/cases/new")) return "New Case";
    if (location.pathname.startsWith("/cases/")) return "Case Workspace";
    if (location.pathname.startsWith("/cases")) return "Cases";
    if (location.pathname.startsWith("/admin/users")) return "Team";
    if (location.pathname.startsWith("/admin/audit")) return "Audit Log";
    if (location.pathname.startsWith("/admin/org")) return "Organization";
    return "";
  })();

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <NavLink to="/dashboard" className="sidebar__logo">
          <div className="sidebar__logo-mark">M</div>
          <span className="sidebar__logo-text">Med<span>AI</span></span>
        </NavLink>

        <div className="sidebar__divider" />

        <nav className="sidebar__nav">
          <p className="sidebar__label">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-link__icon">
                <item.Icon size={18} />
              </span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <>
              <p className="sidebar__label" style={{ marginTop: 12 }}>Admin</p>
              {ADMIN_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                >
                  <span className="nav-link__icon">
                    <item.Icon size={18} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{initials(user?.full_name || "U")}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user?.full_name}</div>
              <div className="sidebar__user-role">{user?.role.replace("_", " ")}</div>
            </div>
            <button className="btn-logout" onClick={logout} title="Sign out">
              <LogoutIcon size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <span className="topbar__breadcrumb">MedAI / {routeLabel}</span>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────────────────────────── */
export function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: "badge badge-draft",
    documents: "badge badge-documents",
    extracted: "badge badge-extracted",
    analyzed: "badge badge-analyzed",
    in_review: "badge badge-in_review",
    decided: "badge badge-decided",
  };
  return (
    <span className={cls[status] || "badge badge-draft"}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.8
      }} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ── Confidence bar ───────────────────────────────────────────────────────── */
export function ConfBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar">
        <div className="conf-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}

/* ── Loading / Error / Empty states ──────────────────────────────────────── */
export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", padding: "32px 0" }}>
      <span className="spinner" />
      {text}
    </div>
  );
}

export function Err({ message }: { message: string }) {
  return <div className="alert alert-error">⚠ {message}</div>;
}
