"use client";

import { useState, useEffect } from "react";
import AppShell from "../../components/AppShell";
import { searchQueries as searchQueriesApi } from "../../../lib/api";
import "../../css/dashboard.css";

function formatTs(ts) {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(str, maxLen = 60) {
  if (!str || typeof str !== "string") return "—";
  return str.length <= maxLen ? str : str.slice(0, maxLen) + "…";
}

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

const IconMessage = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function ConversationLogPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [projectIdInput, setProjectIdInput] = useState("");
  const [appliedProjectId, setAppliedProjectId] = useState("");
  const [limit, setLimit] = useState(100);

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await searchQueriesApi.list({
        skip: 0,
        limit,
        ...(appliedProjectId ? { projectId: appliedProjectId } : {}),
      });
      setQueries(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || "Failed to load conversation log");
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [limit, appliedProjectId]);

  const handleApplyFilter = () => {
    setAppliedProjectId(projectIdInput.trim());
  };

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Conversation Log</h1>
          <div className="pageSub">Search queries and answers from the search_queries table</div>
        </div>
      </header>

      <section className="panel tablePanel conversationLogPanel">
        <div className="conversationLogToolbar">
          <div className="conversationLogToolbarTitle">Search queries</div>
          <div className="conversationLogFilters">
            <div className="conversationLogFilterGroup">
              <label htmlFor="conversation-log-project" className="conversationLogLabel">
                Project ID
              </label>
              <input
                id="conversation-log-project"
                type="text"
                className="formInput conversationLogProjectInput"
                placeholder="All projects"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
                aria-label="Filter by project ID"
              />
            </div>
            <div className="conversationLogFilterGroup">
              <label htmlFor="conversation-log-limit" className="conversationLogLabel">
                Items per page
              </label>
              <select
                id="conversation-log-limit"
                className="formInput formSelect conversationLogLimitSelect"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                aria-label="Items per page"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            <div className="conversationLogFilterActions">
              <button
                type="button"
                className="conversationLogBtn conversationLogBtnSecondary"
                onClick={handleApplyFilter}
                aria-label="Apply project filter"
              >
                Apply filter
              </button>
              <button
                type="button"
                className="conversationLogBtn conversationLogBtnPrimary"
                onClick={fetchQueries}
                disabled={loading}
                aria-label="Refresh list"
              >
                <span className="conversationLogBtnIcon"><IconRefresh /></span>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="conversationLogSummary">
          {!loading && !error && (
            <span className="conversationLogSummaryText">
              Showing {queries.length} result{queries.length !== 1 ? "s" : ""}
              {appliedProjectId && (
                <span className="conversationLogSummaryFilter"> · Project: {appliedProjectId}</span>
              )}
            </span>
          )}
          {!loading && queries.length > 0 && (
            <span className="conversationLogSummaryHint">Click a row to view the full conversation</span>
          )}
        </div>

        <div className="conversationLogTableWrap">
          {error && (
            <div className="conversationLogError" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <div className="conversationLogLoading">
              <div className="dashboardSpinner" aria-hidden />
              <span>Loading conversation log…</span>
            </div>
          ) : queries.length === 0 ? (
            <div className="conversationLogEmpty">
              <span className="conversationLogEmptyIcon"><IconMessage /></span>
              <p className="conversationLogEmptyTitle">No search queries yet</p>
              <p className="conversationLogEmptyText">
                Queries will appear here after you run searches from Search/Upload or Intelligence Hub.
              </p>
              <button type="button" className="conversationLogBtn conversationLogBtnPrimary" onClick={fetchQueries}>
                <span className="conversationLogBtnIcon"><IconRefresh /></span>
                Refresh
              </button>
            </div>
          ) : (
            <table className="table conversationLogTable" role="grid" aria-label="Conversation log entries">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Project</th>
                  <th scope="col">Query</th>
                  <th scope="col">Status</th>
                  <th scope="col">Topic</th>
                  <th scope="col" className="conversationLogColAction" aria-label="View" />
                </tr>
              </thead>
              <tbody>
                {queries.map((row, index) => (
                  <tr
                    key={row.id}
                    className="conversationLogRow"
                    onClick={() => setSelected(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(row);
                      }
                    }}
                    aria-label={`View conversation ${row.id}, ${formatTs(row.ts)}`}
                  >
                    <td className="conversationLogTs">{formatTs(row.ts)}</td>
                    <td className="conversationLogProject">{row.project_id || "—"}</td>
                    <td className="conversationLogQuery" title={row.query_text || undefined}>
                      {truncate(row.query_text, 70)}
                    </td>
                    <td>
                      <span className={`conversationLogStatus conversationLogStatus_${(row.answer_status || "unknown").replace(/[^a-z0-9]/gi, "_").toLowerCase()}`}>
                        {row.answer_status || "—"}
                      </span>
                    </td>
                    <td className="conversationLogTopic">{row.topic || "—"}</td>
                    <td className="conversationLogColAction">
                      <span className="conversationLogRowAction" aria-hidden>
                        <IconChevron />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selected && (
        <div
          className="modalBackdrop conversationLogModalBackdrop"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="conversation-log-detail-title"
        >
          <div
            className="modalCard conversationLogModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="conversationLogModalHeader">
              <h2 className="conversationLogModalTitle" id="conversation-log-detail-title">
                Conversation #{selected.id}
              </h2>
              <button
                type="button"
                className="conversationLogModalClose"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="conversationLogModalMeta">
              <span className="conversationLogModalMetaItem">{formatTs(selected.ts)}</span>
              <span className="conversationLogModalMetaItem">Project: {selected.project_id || "—"}</span>
              {selected.topic && <span className="conversationLogModalMetaItem">Topic: {selected.topic}</span>}
              {selected.answer_status && <span className="conversationLogModalMetaItem">Status: {selected.answer_status}</span>}
            </div>
            <div className="conversationLogDetail">
              <div className="conversationLogMessages">
                <div className="conversationLogMessage conversationLogMessageUser">
                  <div className="conversationLogMessageLabel">
                    <span className="conversationLogMessageRole">User</span>
                    <span className="conversationLogMessageTime">{formatTs(selected.ts)}</span>
                  </div>
                  <div className="conversationLogMessageContent">
                    {selected.query_text || "—"}
                  </div>
                </div>
                <div className="conversationLogMessage conversationLogMessageAssistant">
                  <div className="conversationLogMessageLabel">
                    <span className="conversationLogMessageRole">Assistant</span>
                    <span className="conversationLogMessageTime">Answer</span>
                  </div>
                  <div className="conversationLogMessageContent">
                    {selected.answer != null && selected.answer !== "" ? selected.answer : "— No answer stored —"}
                  </div>
                </div>
              </div>
            </div>
            <div className="conversationLogModalFooter">
              <button type="button" className="conversationLogBtn conversationLogBtnSecondary conversationLogModalCloseBtn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
