"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "../../components/AppShell";
import { DateRangeFilterDropdown, toDateString } from "../../components/DatePickerCalendar";
import { API_BASE, endpointLogs as endpointLogsApi } from "../../../lib/api";
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

export default function EndpointLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailTab, setDetailTab] = useState("request"); // "request" | "response"
  const [filters, setFilters] = useState({ method: "", path: "", limit: 100 });
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [customDateStart, setCustomDateStart] = useState(null);
  const [customDateEnd, setCustomDateEnd] = useState(null);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: 0,
        limit: filters.limit,
        ...(filters.method ? { method: filters.method } : {}),
        ...(filters.path ? { path: filters.path } : {}),
      };
      if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
        params.from_date = customDateStart;
        params.to_date = customDateEnd;
      } else if (dateRangeFilter === "today") {
        params.from_date = todayStr;
        params.to_date = todayStr;
      } else if (dateRangeFilter === "last7" || dateRangeFilter === "last30") {
        const days = dateRangeFilter === "last7" ? 7 : 30;
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - days);
        params.from_date = toDateString(start);
        params.to_date = toDateString(end);
      }
      const list = await endpointLogsApi.list(params);
      setLogs(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || "Failed to load endpoint logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.limit, filters.method, dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  // Path filter is applied when user clicks Refresh (avoids refetch on every keystroke)

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Endpoint Log</h1>
          <div className="pageSub">View API endpoint request and response history</div>
        </div>
      </header>

      <section className="panel tablePanel endpointLogPanel">
        <div className="tableHeader teamTableHeader">
          <div className="teamTableHeaderLeft">
            <div className="tableTitle">Executed endpoints</div>
            <div className="endpointLogFilters">
              <DateRangeFilterDropdown
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
                customDateStart={customDateStart}
                customDateEnd={customDateEnd}
                onCustomRangeChange={(start, end) => {
                  setCustomDateStart(start);
                  setCustomDateEnd(end);
                }}
                open={openDateDropdown}
                onOpenChange={setOpenDateDropdown}
                triggerLabel="Date range"
                applyLabel="Apply range"
              />
              <select
                className="formInput formSelect endpointLogSelect"
                value={filters.method}
                onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                aria-label="Filter by method"
              >
                <option value="">All methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                type="text"
                className="formInput endpointLogPathInput"
                placeholder="Filter by path…"
                value={filters.path}
                onChange={(e) => setFilters((f) => ({ ...f, path: e.target.value }))}
                aria-label="Filter by path"
              />
              <button type="button" className="ghostBtn" onClick={fetchLogs} aria-label="Refresh">
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="tableWrap">
          {error && (
            <div className="panelSub" style={{ padding: 12, color: "var(--colorError, #c00)" }}>
              {error}
            </div>
          )}
          {loading ? (
            <div className="panelSub" style={{ padding: 24 }}>Loading endpoint logs…</div>
          ) : logs.length === 0 ? (
            <div className="panelSub" style={{ padding: 24 }}>No endpoint logs yet. Requests will appear here after you use the app.</div>
          ) : (
            <table className="table endpointLogTable">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>METHOD</th>
                  <th>PATH</th>
                  <th>STATUS</th>
                  <th>DURATION</th>
                  <th>USER</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="endpointLogRow"
                    onClick={() => {
                      setSelectedLog(log);
                      setDetailTab("request");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLog(log);
                        setDetailTab("request");
                      }
                    }}
                    aria-label={`View log ${log.method} ${log.path}`}
                  >
                    <td>{formatTs(log.ts)}</td>
                    <td>
                      <span className={`endpointLogMethod endpointLogMethod_${(log.method || "").toLowerCase()}`}>
                        {log.method || "—"}
                      </span>
                    </td>
                    <td className="endpointLogPath">{log.path || "—"}</td>
                    <td>
                      <span className={`endpointLogStatus endpointLogStatus_${log.status_code >= 400 ? "error" : "ok"}`}>
                        {log.status_code ?? "—"}
                      </span>
                    </td>
                    <td>{log.duration_ms != null ? `${log.duration_ms} ms` : "—"}</td>
                    <td>{log.actor_user_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedLog && (
        <div
          className="modalBackdrop endpointLogModalBackdrop"
          onClick={() => setSelectedLog(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="endpoint-log-detail-title"
        >
          <div
            className="modalCard endpointLogModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="endpointLogModalHeader">
              <h2 className="endpointLogModalTitle" id="endpoint-log-detail-title">
                <span className="endpointLogModalMethod">{selectedLog.method}</span>
                <span className="endpointLogModalPath">{selectedLog.path}</span>
              </h2>
              <button
                type="button"
                className="endpointLogModalClose"
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="endpointLogTabs" role="tablist" aria-label="Request and response">
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === "request"}
                aria-controls="endpoint-log-request-panel"
                id="endpoint-log-tab-request"
                className={`endpointLogTab ${detailTab === "request" ? "endpointLogTabActive" : ""}`}
                onClick={() => setDetailTab("request")}
              >
                Request
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === "response"}
                aria-controls="endpoint-log-response-panel"
                id="endpoint-log-tab-response"
                className={`endpointLogTab ${detailTab === "response" ? "endpointLogTabActive" : ""}`}
                onClick={() => setDetailTab("response")}
              >
                Response
              </button>
            </div>
            <div className="endpointLogDetail">
              {detailTab === "request" && (
                <div id="endpoint-log-request-panel" role="tabpanel" aria-labelledby="endpoint-log-tab-request" className="endpointLogDetailSection">
                  {/* URL */}
                  <div className="endpointLogRequestBlock">
                    <div className="endpointLogRequestBlockTitle">URL</div>
                    <div className="endpointLogRequestBlockContent">
                      <code className="endpointLogCode endpointLogUrl">
                        {selectedLog.path
                          ? `${API_BASE.replace(/\/$/, "")}${(selectedLog.path || "").startsWith("/") ? "" : "/"}${selectedLog.path || ""}${selectedLog.query_string ? `?${selectedLog.query_string}` : ""}`
                          : "—"}
                      </code>
                    </div>
                  </div>
                  {/* Headers — key / value pairs */}
                  <div className="endpointLogRequestBlock">
                    <div className="endpointLogRequestBlockTitle">Headers</div>
                    <div className="endpointLogRequestBlockContent">
                      {selectedLog.request_headers ? (() => {
                        try {
                          const h = JSON.parse(selectedLog.request_headers);
                          const entries = Object.entries(h);
                          if (entries.length === 0) return <span className="endpointLogMuted">No headers</span>;
                          return (
                            <div className="endpointLogHeadersTable">
                              <div className="endpointLogHeadersRow endpointLogHeadersRowHeader">
                                <span className="endpointLogHeadersKey">Key</span>
                                <span className="endpointLogHeadersValue">Value</span>
                              </div>
                              {entries.map(([k, v]) => (
                                <div key={k} className="endpointLogHeadersRow">
                                  <span className="endpointLogHeadersKey">{k}</span>
                                  <span className="endpointLogHeadersValue">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        } catch {
                          return <pre className="endpointLogPre">{selectedLog.request_headers}</pre>;
                        }
                      })() : <span className="endpointLogMuted">Not captured</span>}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="endpointLogRequestBlock">
                    <div className="endpointLogRequestBlockTitle">Body</div>
                    <div className="endpointLogRequestBlockContent">
                      {selectedLog.request_body != null && selectedLog.request_body !== "" ? (
                        <pre className="endpointLogPre endpointLogBody">
                          {(() => {
                            try {
                              const parsed = JSON.parse(selectedLog.request_body);
                              return JSON.stringify(parsed, null, 2);
                            } catch {
                              return selectedLog.request_body;
                            }
                          })()}
                        </pre>
                      ) : <span className="endpointLogMuted">Empty or not captured</span>}
                    </div>
                  </div>
                  {/* Meta (timestamp, user, IP, user-agent) */}
                  <div className="endpointLogRequestBlock endpointLogRequestMeta">
                    <div className="endpointLogRequestBlockTitle">Meta</div>
                    <dl className="endpointLogKeyValue">
                      <div className="endpointLogKeyValueRow">
                        <dt>Method</dt>
                        <dd><span className={`endpointLogMethod endpointLogMethod_${(selectedLog.method || "").toLowerCase()}`}>{selectedLog.method || "—"}</span></dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>Timestamp</dt>
                        <dd>{formatTs(selectedLog.ts)}</dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>User ID</dt>
                        <dd>{selectedLog.actor_user_id || "—"}</dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>IP address</dt>
                        <dd>{selectedLog.ip_address || "—"}</dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>User-Agent</dt>
                        <dd className="endpointLogUserAgent">{selectedLog.user_agent || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
              {detailTab === "response" && (
                <div id="endpoint-log-response-panel" role="tabpanel" aria-labelledby="endpoint-log-tab-response" className="endpointLogDetailSection">
                  {/* Meta: status, duration, error */}
                  <div className="endpointLogRequestBlock endpointLogRequestMeta">
                    <div className="endpointLogRequestBlockTitle">Summary</div>
                    <dl className="endpointLogKeyValue">
                      <div className="endpointLogKeyValueRow">
                        <dt>Status code</dt>
                        <dd>
                          <span className={`endpointLogStatus endpointLogStatus_${selectedLog.status_code >= 400 ? "error" : "ok"}`}>
                            {selectedLog.status_code ?? "—"}
                          </span>
                        </dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>Duration</dt>
                        <dd>{selectedLog.duration_ms != null ? `${selectedLog.duration_ms} ms` : "—"}</dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>Error / message</dt>
                        <dd>{selectedLog.error_message || "—"}</dd>
                      </div>
                      <div className="endpointLogKeyValueRow">
                        <dt>Request ID</dt>
                        <dd>{selectedLog.request_id || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                  {/* Response Headers — key / value pairs */}
                  <div className="endpointLogRequestBlock">
                    <div className="endpointLogRequestBlockTitle">Response headers</div>
                    <div className="endpointLogRequestBlockContent">
                      {selectedLog.response_headers ? (() => {
                        try {
                          const h = JSON.parse(selectedLog.response_headers);
                          const entries = Object.entries(h);
                          if (entries.length === 0) return <span className="endpointLogMuted">No headers</span>;
                          return (
                            <div className="endpointLogHeadersTable">
                              <div className="endpointLogHeadersRow endpointLogHeadersRowHeader">
                                <span className="endpointLogHeadersKey">Key</span>
                                <span className="endpointLogHeadersValue">Value</span>
                              </div>
                              {entries.map(([k, v]) => (
                                <div key={k} className="endpointLogHeadersRow">
                                  <span className="endpointLogHeadersKey">{k}</span>
                                  <span className="endpointLogHeadersValue">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        } catch {
                          return <pre className="endpointLogPre">{selectedLog.response_headers}</pre>;
                        }
                      })() : <span className="endpointLogMuted">Not captured</span>}
                    </div>
                  </div>
                  {/* Response body (API response) */}
                  <div className="endpointLogRequestBlock">
                    <div className="endpointLogRequestBlockTitle">Response body</div>
                    <div className="endpointLogRequestBlockContent">
                      {selectedLog.response_body != null && selectedLog.response_body !== "" ? (
                        <pre className="endpointLogPre endpointLogBody">
                          {(() => {
                            try {
                              const parsed = JSON.parse(selectedLog.response_body);
                              return JSON.stringify(parsed, null, 2);
                            } catch {
                              return selectedLog.response_body;
                            }
                          })()}
                        </pre>
                      ) : <span className="endpointLogMuted">Empty or not captured</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="endpointLogModalFooter">
              <button type="button" className="ghostBtn endpointLogModalCloseBtn" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
