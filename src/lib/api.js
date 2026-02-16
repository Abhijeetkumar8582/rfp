/**
 * API client for RFP backend.
 * Uses NEXT_PUBLIC_API_URL (default: http://localhost:8000)
 */

export const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

const TOKEN_KEY = "rfp_access_token";
const REFRESH_KEY = "rfp_refresh_token";
const USER_KEY = "rfp_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access, refresh, user) {
  if (typeof window === "undefined") return;
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    ...(options.headers || {}),
  };
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshed = await refreshAccessToken(refresh);
      if (refreshed) {
        return apiFetch(path, options);
      }
    }
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail || (Array.isArray(json.detail) ? json.detail.map((d) => d.msg).join(" ") : JSON.stringify(json.detail));
    } catch {
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return res.text();
}

async function refreshAccessToken(refreshToken) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token, data.user);
    return true;
  } catch {
    return false;
  }
}

// Auth (use raw fetch — no token, no 401 refresh logic)
async function authFetch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail || (Array.isArray(json.detail) ? json.detail.map((d) => d.msg || d).join(" ") : String(json.detail || res.statusText));
    } catch {
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const auth = {
  async login(email, password) {
    const data = await authFetch("/api/v1/auth/login", { email, password });
    setTokens(data.access_token, data.refresh_token, data.user);
    return data;
  },

  async register(email, name, password) {
    return authFetch("/api/v1/auth/register", { email, name, password });
  },

  async logout() {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
      } catch {
        /* ignore */
      }
    }
    clearTokens();
  },
};

// Projects
export const projects = {
  async list(skip = 0, limit = 100) {
    return apiFetch(`/api/v1/projects?skip=${skip}&limit=${limit}`);
  },

  async create(body) {
    return apiFetch("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async get(id) {
    return apiFetch(`/api/v1/projects/${id}`);
  },
};

// Documents
export const documents = {
  async list(projectId = null, skip = 0, limit = 100) {
    let path = `/api/v1/documents?skip=${skip}&limit=${limit}`;
    if (projectId != null) path += `&project_id=${projectId}`;
    return apiFetch(path);
  },

  async upload(projectId, uploadedBy, file) {
    const form = new FormData();
    form.append("project_id", String(projectId));
    form.append("uploaded_by", String(uploadedBy));
    form.append("file", file);
    return apiFetch("/api/v1/documents", {
      method: "POST",
      body: form,
    });
  },

  async get(id) {
    return apiFetch(`/api/v1/documents/${id}`);
  },

  async getChunks(documentId) {
    return apiFetch(`/api/v1/documents/${documentId}/chunks`);
  },

  /** Generate GPT metadata from chunks (title, description, doc_type, tags). Call after upload when chunks exist. */
  async generateMetadata(documentId) {
    return apiFetch(`/api/v1/documents/${documentId}/generate-metadata`, {
      method: "POST",
    });
  },
};

// RFP Questions (import from Excel/CSV, list with pagination)
export const rfpQuestions = {
  async list(params = {}) {
    const { skip = 0, limit = 20, user_id, status } = params;
    const q = new URLSearchParams();
    q.set("skip", String(skip));
    q.set("limit", String(limit));
    if (user_id != null) q.set("user_id", String(user_id));
    if (status != null && status !== "" && status !== "all") q.set("status", String(status));
    return apiFetch(`/api/v1/rfp-questions?${q.toString()}`);
  },

  async importQuestions(userId, file) {
    const form = new FormData();
    form.append("user_id", String(userId));
    form.append("file", file);
    return apiFetch("/api/v1/rfp-questions/import", {
      method: "POST",
      body: form,
    });
  },
};

// Search (backend may not be fully implemented)
export const search = {
  async query(queryText, k = 5) {
    return apiFetch("/api/v1/search/query", {
      method: "POST",
      body: JSON.stringify({ query_text: queryText, k }),
    });
  },
};

// Activity logs — list and create
export const activity = {
  async list(params = {}) {
    const { actor, event_action, severity, system, skip = 0, limit = 100 } = params;
    const q = new URLSearchParams();
    if (skip != null) q.set("skip", String(skip));
    if (limit != null) q.set("limit", String(limit));
    if (actor) q.set("actor", actor);
    if (event_action) q.set("event_action", event_action);
    if (severity) q.set("severity", severity);
    if (system) q.set("system", system);
    const query = q.toString();
    return apiFetch(`/api/v1/activity/logs${query ? `?${query}` : ""}`);
  },

  async create(body) {
    return apiFetch("/api/v1/activity/logs", {
      method: "POST",
      body: JSON.stringify({
        actor: body.actor,
        event_action: body.event_action,
        target_resource: body.target_resource ?? "",
        severity: body.severity ?? "info",
        ip_address: body.ip_address ?? null,
        system: body.system ?? "web",
      }),
    });
  },
};
