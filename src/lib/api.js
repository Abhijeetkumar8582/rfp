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
  } else if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    if (err?.name === "TypeError" && err?.message?.toLowerCase?.().includes("fetch")) {
      throw new Error(`Backend unreachable at ${API_BASE}. Is the server running?`);
    }
    throw err;
  }
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
  } catch (err) {
    if (err?.name === "TypeError" && err?.message?.toLowerCase?.().includes("fetch")) {
      return false; /* backend down */
    }
    return false;
  }
}

// Auth (use raw fetch — no token, no 401 refresh logic)
async function authFetch(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === "TypeError" && err?.message?.toLowerCase?.().includes("fetch")) {
      throw new Error(`Backend unreachable at ${API_BASE}. Is the server running?`);
    }
    throw err;
  }
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

/**
 * Decode invite JWT payload without verification (display only).
 * Returns { email, name } or null if token is not a valid JWT or missing email.
 * Do not use for auth — backend verifies the token.
 */
export function decodeInviteTokenPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const data = JSON.parse(json);
    if (data.email == null) return null;
    return { email: data.email, name: data.name || "" };
  } catch {
    return null;
  }
}

/**
 * Validate invite token (unauthenticated). Returns { email, name, expires_at } if valid.
 * Used by /set-password page to confirm link is not used/revoked.
 */
export async function validateInvite(token) {
  const url = `${API_BASE}/api/v1/auth/invite/validate?${new URLSearchParams({ token }).toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail || String(json.detail || res.statusText);
    } catch {
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(detail || "Invalid or expired link");
  }
  return res.json();
}

/**
 * Complete invite: set password and activate account (unauthenticated).
 * Stores tokens and returns { access_token, refresh_token, user } so caller can refresh auth state and redirect.
 */
export async function completeInvite({ token, new_password }) {
  const res = await fetch(`${API_BASE}/api/v1/auth/invite/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
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
    throw new Error(detail || "Request failed");
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token, data.user);
  return data;
}

/** Create a new user invite (backend creates user, sends set-password email). */
export async function createUserInvite(body) {
  return apiFetch("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Users — list from users table (requires auth)
export const users = {
  /**
   * @param {{ skip?: number, limit?: number }} [params]
   * @returns {Promise<Array<{ id: string, email: string, name: string, role: string, is_active: boolean, created_at: string }>>}
   */
  async list(params = {}) {
    const { skip = 0, limit = 100 } = params;
    const q = new URLSearchParams();
    q.set("skip", String(skip));
    q.set("limit", String(limit));
    return apiFetch(`/api/v1/users?${q.toString()}`);
  },

  /** Get a single user by id. */
  async get(userId) {
    return apiFetch(`/api/v1/users/${encodeURIComponent(userId)}`);
  },

  /**
   * Update user. Only provided fields are sent.
   * @param {string} userId
   * @param {{ name?: string, email?: string, role?: string, is_active?: boolean }} body
   */
  async update(userId, body) {
    return apiFetch(`/api/v1/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /**
   * Delete user.
   * @param {string} userId
   * @param {{ permanent?: boolean }} [options] - permanent: true to hard delete (remove from DB); default soft delete (deactivate).
   */
  async delete(userId, options = {}) {
    const q = new URLSearchParams();
    if (options.permanent) q.set("permanent", "true");
    const query = q.toString();
    const url = `/api/v1/users/${encodeURIComponent(userId)}${query ? `?${query}` : ""}`;
    return apiFetch(url, { method: "DELETE" });
  },

  /** Create a new user invite (backend creates user, sends set-password email). */
  createInvite: createUserInvite,
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

  /**
   * List RFP documents for a project (non-deleted).
   * @param {string} projectId
   * @param {number} [skip=0]
   * @param {number} [limit=100]
   * @returns {Promise<Array>} list of document objects
   */
  async listDocuments(projectId, skip = 0, limit = 100) {
    return apiFetch(`/api/v1/projects/${projectId}/documents?skip=${skip}&limit=${limit}`);
  },

  /**
   * Train datasource: sync all document chunks and embeddings from DB to ChromaDB for this project.
   * @param {number} projectId
   * @param {object} [config] - Optional: chunk_size_words, chunk_overlap_words, embedding_model, include_metadata
   * @returns {{ message: string, documents_synced: number, chunks_synced: number }}
   */
  async trainDatasource(projectId, config = {}) {
    return apiFetch(`/api/v1/projects/${projectId}/train-datasource`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },
};

// Documents
export const documents = {
  async list(projectId = null, skip = 0, limit = 100) {
    let path = `/api/v1/documents?skip=${skip}&limit=${limit}`;
    if (projectId != null) path += `&project_id=${projectId}`;
    return apiFetch(path);
  },

  async upload(projectId, uploadedBy, file, options = {}) {
    const form = new FormData();
    form.append("project_id", String(projectId));
    form.append("uploaded_by", String(uploadedBy));
    form.append("file", file);
    if (options.extractPdfImages !== undefined) {
      form.append("extract_pdf_images", String(options.extractPdfImages));
    }
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

  /**
   * Update document metadata (title, description, doc_type, tags, taxonomy_suggestions).
   * @param {string} documentId
   * @param {{ doc_title?: string, doc_description?: string, doc_type?: string, tags?: string[], taxonomy_suggestions?: object }} body
   */
  async update(documentId, body) {
    return apiFetch(`/api/v1/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /** Soft-delete document and remove from ChromaDB. */
  async delete(documentId) {
    return apiFetch(`/api/v1/documents/${documentId}`, {
      method: "DELETE",
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

  /** Get a single RFP by rfpid (full details including questions and answers). */
  async get(rfpid) {
    return apiFetch(`/api/v1/rfp-questions/${encodeURIComponent(rfpid)}`);
  },

  /** Delete an RFP by rfpid. */
  async delete(rfpid) {
    return apiFetch(`/api/v1/rfp-questions/${encodeURIComponent(rfpid)}`, {
      method: "DELETE",
    });
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

  /**
   * Update answers array for an RFP (same order as questions).
   * @param {string} rfpid - RFP id from import
   * @param {string[]} answers - Array of answer strings
   * @param {number[]} [confidence] - Optional array of confidence values (0-1), one per question, same order
   */
  async updateAnswers(rfpid, answers, confidence = null) {
    const body = { answers };
    if (confidence != null && Array.isArray(confidence)) body.confidence = confidence;
    return apiFetch(`/api/v1/rfp-questions/${encodeURIComponent(rfpid)}/answers`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

// Rephrase — rephrase answer in a more technical way (question + answer → rephrased answer)
export const rephrase = {
  /**
   * @param {string} question - The question context
   * @param {string} answer - The answer to rephrase (min length 1)
   * @returns {{ rephrased_answer: string }}
   */
  async rephrase(question, answer) {
    return apiFetch("/api/v1/rephrase", {
      method: "POST",
      body: JSON.stringify({ question: question || "", answer: (answer || "").trim() }),
    });
  },
};

// Intelligence Hub — dashboard data from search_queries and documents
export const intelligenceHub = {
  /**
   * @param {string} [projectId] - Optional project ID; uses first project if omitted
   * @returns {{ most_searched_topics: Array<{topic:string,count:number}>, low_confidence_areas: Array<{section:string,confidence:number}>, gaps_in_knowledge: Array<{area:string,priority:string}>, recently_uploaded: Array<{name:string,time:string,size:string}> }}
   */
  async get(projectId = null) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return apiFetch(`/api/v1/search/intelligence${q}`);
  },
};

// Dashboard analytics — aggregated metrics for the dashboard page
export const dashboard = {
  /**
   * @param {string} [projectId] - Optional project ID; uses first project if omitted
   * @param {number} [days=28] - Time window in days
   * @returns {Promise<{ overall_answer_accuracy: number, total_questions_answered: number, total_unanswered_questions: number, total_active_users: number, average_confidence_score: number, search_success_rate: number, low_confidence_answers: number, average_response_time_ms: number|null, high_severity_knowledge_gaps: number, total_chunks_index: number }>}
   */
  async getMetrics(projectId = null, days = 28) {
    const params = new URLSearchParams();
    if (projectId != null) params.set("project_id", String(projectId));
    if (days != null) params.set("days", String(days));
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/api/v1/analytics/dashboard-metrics${q}`);
  },

  /**
   * Chart data for dashboard: search volume, answer status, confidence trend, response time, feedback.
   * @param {string} [projectId]
   * @param {number} [days=28]
   * @returns {Promise<{ search_volume_trend: Array<{date:string,count:number}>, answer_status_breakdown: Array<{status:string,count:number}>, confidence_trend: Array<{date:string,value:number}>, response_time_trend: Array<{date:string,value:number}>, feedback_sentiment: Array<{status:string,count:number}> }>}
   */
  async getChartData(projectId = null, days = 28) {
    const params = new URLSearchParams();
    if (projectId != null) params.set("project_id", String(projectId));
    if (days != null) params.set("days", String(days));
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/api/v1/analytics/chart-data${q}`);
  },

  /**
   * Questions that were not answered by the search (knowledge gaps).
   * @param {string} [projectId]
   * @param {number} [days=28]
   * @returns {Promise<{ items: Array<{ id: number, query_text: string, datetime: string, no_answer_reason: string|null }> }>}
   */
  async getKnowledgeGaps(projectId = null, days = 28) {
    const params = new URLSearchParams();
    if (projectId != null) params.set("project_id", String(projectId));
    if (days != null) params.set("days", String(days));
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/api/v1/analytics/knowledge-gaps${q}`);
  },

  /**
   * List all FAQs (for Contextual Document Segmentation / FAQs section).
   * @returns {Promise<{ items: Array<{ faqId: string, question: string, answer: string }> }>}
   */
  async getFaqs() {
    return apiFetch("/api/v1/analytics/faqs");
  },

  /**
   * Validate FAQ answers: LLM rates how well each answer addresses the question (0-100).
   * @param {{ items: Array<{ search_query_id: number, question: string, answer: string }> }} body
   * @returns {Promise<{ results: Array<{ search_query_id: number, confidence: number }> }>}
   */
  async validateFaqAnswers(body) {
    return apiFetch("/api/v1/analytics/knowledge-gaps/validate-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  /**
   * Save Review gaps answers to FAQs and remove those questions from search_queries.
   * @param {{ items: Array<{ search_query_id: number, answer: string }> }} body
   * @returns {Promise<{ saved: number, message: string }>}
   */
  async saveFaqAnswers(body) {
    return apiFetch("/api/v1/analytics/knowledge-gaps/save-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

// API Credentials (Settings)
export const apiCredentials = {
  /** Get OpenAI settings (admin only). */
  async getOpenAI() {
    return apiFetch("/api/v1/api-credentials/openai");
  },

  /** Save OpenAI settings (admin only). */
  async saveOpenAI(body) {
    return apiFetch("/api/v1/api-credentials/openai", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async testOpenAIChat(body) {
    return apiFetch("/api/v1/api-credentials/openai/test/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async testOpenAIEmbedding(body) {
    return apiFetch("/api/v1/api-credentials/openai/test/embedding", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async testOpenAIOcr(body) {
    return apiFetch("/api/v1/api-credentials/openai/test/ocr", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// Search — question embedding vs ChromaDB document embeddings
export const search = {
  /**
   * @param {string} queryText - User question
   * @param {number} projectId - Project whose ChromaDB collection to search
   * @param {number} [k=5] - Top-k chunks to return
   * @param {{ advanced_search?: boolean }} [opts] - advanced_search: enable Query Intelligence Layer (cleanup, intent, split, rewrite, domain, filters, clarification)
   * @returns {{ query_text: string, project_id: number, k: number, results: Array<...>, advanced_search_used?, cleaned_query?, clarification_needed?, clarification_questions? }}
   */
  async query(queryText, projectId, k = 5, opts = {}) {
    const { advanced_search = false } = opts;
    return apiFetch("/api/v1/search/query", {
      method: "POST",
      body: JSON.stringify({ query_text: queryText, project_id: projectId, k, advanced_search }),
    });
  },

  /**
   * Search + GPT answer (RAG): same as query, then GPT synthesizes an answer from top-k chunks.
   * @param {string} queryText - User question
   * @param {number} projectId - Project whose ChromaDB collection to search
   * @param {number} [k=10] - Top-k chunks to retrieve and pass to GPT
   * @param {{ advanced_search?: boolean, conversation_id?: string }} [opts] - advanced_search; conversation_id for chat grouping (same id for follow-up queries, valid 24h)
   * @returns {{ query_text, project_id, k, results, answer, conversation_id?, ... }}
   */
  async answer(queryText, projectId, k = 10, opts = {}) {
    const { advanced_search = false, conversation_id } = opts;
    const body = { query_text: queryText, project_id: projectId, k, advanced_search };
    if (conversation_id) body.conversation_id = conversation_id;
    return apiFetch("/api/v1/search/answer", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Agentic reasoning search: query understanding, rewriting, multi-query retrieval,
   * evidence bundling, reranking, answer synthesis, self-check.
   * @param {string} queryText - User question
   * @param {number} projectId - Project whose ChromaDB collection to search
   * @param {object} [opts] - Optional: k, top_k, skip_self_check, advanced_search, conversation_id (chat grouping, valid 24h)
   */
  async reasoning(queryText, projectId, opts = {}) {
    const { k = 20, top_k = 12, skip_self_check = false, advanced_search = false, conversation_id } = opts;
    const body = {
      query_text: queryText,
      project_id: projectId,
      k,
      top_k,
      skip_self_check,
      advanced_search,
    };
    if (conversation_id) body.conversation_id = conversation_id;
    return apiFetch("/api/v1/search/reasoning", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Streaming reasoning: same as reasoning but returns Server-Sent Events.
   * Calls onEvent({ type, data }) for each event (status, query_analysis, search_query, confidence, result, error).
   * Resolves with the full result when event type is "result"; rejects on "error" or HTTP error.
   * @param {object} [opts] - Optional: k, top_k, skip_self_check, advanced_search, conversation_id (chat grouping, valid 24h)
   */
  async reasoningStream(queryText, projectId, opts = {}, { onEvent } = {}) {
    const { k = 20, top_k = 12, skip_self_check = false, advanced_search = false, conversation_id } = opts;
    const url = `${API_BASE}/api/v1/search/reasoning/stream`;
    const headers = {
      "Content-Type": "application/json",
    };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body = {
      query_text: queryText,
      project_id: projectId,
      k,
      top_k,
      skip_self_check,
      advanced_search,
    };
    if (conversation_id) body.conversation_id = conversation_id;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err?.name === "TypeError" && err?.message?.toLowerCase?.().includes("fetch")) {
        throw new Error(`Backend unreachable at ${API_BASE}. Is the server running?`);
      }
      throw err;
    }

    if (res.status === 401) {
      const refresh = getRefreshToken();
      if (refresh) {
        const refreshed = await refreshAccessToken(refresh);
        if (refreshed) return this.reasoningStream(queryText, projectId, opts, { onEvent });
      }
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Session expired");
    }

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const json = await res.json();
        if (json.detail) detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      } catch (_) {
        const t = await res.text();
        if (t) detail = t;
      }
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = null;
    let currentData = [];

    const emit = (type, data) => {
      if (onEvent) onEvent({ type, data });
    };

    return new Promise((resolve, reject) => {
      const processLine = (line) => {
        if (line.startsWith("event:")) {
          if (currentEvent != null && currentData.length > 0) {
            try {
              const data = JSON.parse(currentData.join("\n"));
              if (currentEvent === "result") {
                resolve(data);
                return "done";
              }
              if (currentEvent === "error") {
                reject(new Error(data.detail || "Stream error"));
                return "done";
              }
              emit(currentEvent, data);
            } catch (e) {
              if (currentEvent === "error") reject(e);
            }
          }
          currentEvent = line.slice(6).trim();
          currentData = [];
          return null;
        }
        if (line.startsWith("data:")) {
          currentData.push(line.slice(5).trimStart());
          return null;
        }
        return null;
      };

      const pump = () => {
        reader.read().then(({ value, done }) => {
          if (done) {
            if (currentEvent && currentData.length > 0) {
              try {
                const data = JSON.parse(currentData.join("\n"));
                if (currentEvent === "result") resolve(data);
                else if (currentEvent === "error") reject(new Error(data.detail || "Stream error"));
                else emit(currentEvent, data);
              } catch (_) {}
            }
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const block of parts) {
            const lines = block.split("\n");
            for (const line of lines) {
              const out = processLine(line);
              if (out === "done") return;
            }
            if (currentEvent != null && currentData.length > 0) {
              try {
                const data = JSON.parse(currentData.join("\n"));
                if (currentEvent === "result") {
                  resolve(data);
                  return;
                }
                if (currentEvent === "error") {
                  reject(new Error(data.detail || "Stream error"));
                  return;
                }
                emit(currentEvent, data);
              } catch (_) {}
              currentEvent = null;
              currentData = [];
            }
          }
          pump();
        }).catch(reject);
      };
      pump();
    });
  },

  /**
   * Submit feedback for a search query.
   * @param {number} searchQueryId - ID of the search query (from GET /search/queries)
   * @param {object} feedback - { feedback_status: "positive"|"negative"|"neutral"|"not_given", feedback_score: 1|0|-1, feedback_reason?: string, feedback_text?: string }
   */
  async submitFeedback(searchQueryId, feedback) {
    return apiFetch(`/api/v1/search/queries/${searchQueryId}/feedback`, {
      method: "PATCH",
      body: JSON.stringify(feedback),
    });
  },
};

// Conversation log — search_queries table (list and get by id)
export const searchQueries = {
  /**
   * List search queries for conversation log.
   * @param {{ projectId?: string, skip?: number, limit?: number }} [params]
   * @returns {Promise<Array<{ id: number, ts: string, project_id: string, query_text: string, answer: string|null, answer_status: string|null, topic: string|null, feedback_status: string|null, ... }>>}
   */
  async list(params = {}) {
    const { projectId, skip = 0, limit = 100, on_date: onDate, from_date: fromDate, to_date: toDate } = params;
    const q = new URLSearchParams();
    if (skip != null) q.set("skip", String(skip));
    if (limit != null) q.set("limit", String(limit));
    if (projectId) q.set("project_id", projectId);
    if (onDate) q.set("on_date", onDate);
    if (fromDate) q.set("from_date", fromDate);
    if (toDate) q.set("to_date", toDate);
    const query = q.toString();
    return apiFetch(`/api/v1/search/queries${query ? `?${query}` : ""}`);
  },

  /**
   * Get a single search query by id (for conversation log detail).
   * @param {number} id
   */
  async get(id) {
    return apiFetch(`/api/v1/search/queries/${id}`);
  },

  /**
   * Get all Q&A messages for a conversation (same conversation_id), ordered by time.
   * Use when user opens a conversation in the log to show full thread.
   * @param {string} conversationId
   * @returns {Promise<Array<{ id: number, ts: string, query_text: string, answer: string|null, ... }>>}
   */
  async getByConversationId(conversationId) {
    return apiFetch(`/api/v1/search/queries/by-conversation/${encodeURIComponent(conversationId)}`);
  },
};

// Activity logs — list and create (returns { items, total, total_last_7_days })
export const activity = {
  async list(params = {}) {
    const { actor, event_action, severity, severity_in, system, q: searchQ, days, from_date, to_date, skip = 0, limit = 100 } = params;
    const q = new URLSearchParams();
    if (skip != null) q.set("skip", String(skip));
    if (limit != null) q.set("limit", String(limit));
    if (actor) q.set("actor", actor);
    if (event_action) q.set("event_action", event_action);
    if (severity) q.set("severity", severity);
    if (severity_in) q.set("severity_in", severity_in);
    if (system) q.set("system", system);
    if (searchQ) q.set("q", searchQ);
    if (days != null) q.set("days", String(days));
    if (from_date) q.set("from_date", from_date);
    if (to_date) q.set("to_date", to_date);
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

// Access Intelligence — document access logs (view, download, upload)
export const accessIntelligence = {
  /**
   * Log a document access event (view, download, or upload).
   * @param {{ user_id?: string, username: string, document_name: string, document_id?: string, access_level: string, action: 'view'|'download'|'upload' }} body
   */
  async create(body) {
    return apiFetch("/api/v1/access-intelligence/logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: body.user_id ?? null,
        username: body.username,
        document_name: body.document_name,
        document_id: body.document_id ?? null,
        access_level: body.access_level,
        action: body.action,
      }),
    });
  },

  /**
   * List document access logs with optional filters.
   * @param {{ user_id?: string, username?: string, document_name?: string, document_id?: string, access_level?: string, action?: string, from_date?: string, to_date?: string, skip?: number, limit?: number }} [params]
   * @returns {Promise<{ items: Array<{ id: number, user_id: string|null, username: string, date_time: string, document_name: string, document_id: string|null, access_level: string, action: string }>, total: number }>}
   */
  async list(params = {}) {
    const { user_id, username, document_name, document_id, access_level, action, from_date, to_date, skip = 0, limit = 100 } = params;
    const q = new URLSearchParams();
    if (skip != null) q.set("skip", String(skip));
    if (limit != null) q.set("limit", String(limit));
    if (user_id) q.set("user_id", user_id);
    if (username) q.set("username", username);
    if (document_name) q.set("document_name", document_name);
    if (document_id) q.set("document_id", document_id);
    if (access_level) q.set("access_level", access_level);
    if (action) q.set("action", action);
    if (from_date) q.set("from_date", from_date);
    if (to_date) q.set("to_date", to_date);
    const query = q.toString();
    return apiFetch(`/api/v1/access-intelligence/logs${query ? `?${query}` : ""}`);
  },
};

// Endpoint logs — list and get by id
export const endpointLogs = {
  async list(params = {}) {
    const { method, path, status_code, from_date, to_date, skip = 0, limit = 100 } = params;
    const q = new URLSearchParams();
    if (skip != null) q.set("skip", String(skip));
    if (limit != null) q.set("limit", String(limit));
    if (method) q.set("method", method);
    if (path) q.set("path", path);
    if (status_code != null) q.set("status_code", String(status_code));
    if (from_date) q.set("from_date", from_date);
    if (to_date) q.set("to_date", to_date);
    const query = q.toString();
    return apiFetch(`/api/v1/endpoint-logs${query ? `?${query}` : ""}`);
  },

  async get(id) {
    return apiFetch(`/api/v1/endpoint-logs/${id}`);
  },
};
