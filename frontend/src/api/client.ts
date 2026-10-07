const TOKEN_KEY = "medai_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        detail = data.detail || JSON.stringify(data);
      }
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Unable to connect to backend API server. If deployed on Vercel, check VITE_API_URL setting.");
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Invalid JSON response from server.");
  }
}

export const api = {
  login(email: string, password: string) {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    return request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  },
  me: () => request("/api/auth/me"),
  org: () => request("/api/orgs/me"),
  updateOrg: (name: string) => request("/api/orgs/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  users: () => request("/api/users"),
  createUser: (payload: object) => request("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: object) =>
    request(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  cases: () => request("/api/cases"),
  createCase: (payload: object) => request("/api/cases", { method: "POST", body: JSON.stringify(payload) }),
  getCase: (id: string) => request(`/api/cases/${id}`),
  updateCase: (id: string, payload: object) =>
    request(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addNote: (id: string, body: string) =>
    request(`/api/cases/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  upload: (id: string, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request(`/api/cases/${id}/documents`, { method: "POST", body: data });
  },
  extract: (id: string) => request(`/api/cases/${id}/extract`, { method: "POST" }),
  editExtraction: (id: string, payload: object) =>
    request(`/api/cases/${id}/extraction`, { method: "PATCH", body: JSON.stringify({ payload }) }),
  analyze: (id: string) => request(`/api/cases/${id}/analyze`, { method: "POST" }),
  review: (id: string, body: string) =>
    request(`/api/cases/${id}/review`, { method: "POST", body: JSON.stringify({ body }) }),
  decide: (id: string, decision: string, comments: string) =>
    request(`/api/cases/${id}/decide`, { method: "POST", body: JSON.stringify({ decision, comments }) }),
  audit: () => request("/api/audit"),
  analytics: () => request("/api/analytics"),
};
