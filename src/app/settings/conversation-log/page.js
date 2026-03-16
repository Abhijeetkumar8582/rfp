"use client";

import { useState, useEffect, useMemo } from "react";
import AppShell from "../../components/AppShell";
import { DateRangeFilterDropdown, toDateString } from "../../components/DatePickerCalendar";
import { searchQueries as searchQueriesApi } from "../../../lib/api";
import "../../css/dashboard.css";

function dateRangeSummary(dateRangeFilter, customDateStart, customDateEnd, todayStr) {
  if (!dateRangeFilter) return " for today";
  if (dateRangeFilter === "today") return " for today";
  if (dateRangeFilter === "last7") return " for last 7 days";
  if (dateRangeFilter === "last30") return " for last 30 days";
  if (dateRangeFilter === "custom" && customDateStart && customDateEnd) return ` for ${customDateStart} – ${customDateEnd}`;
  return " for today";
}

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

/** Group raw query rows by conversation_id. Returns list of { conversationId, firstTs, lastTs, messageCount, firstQueryPreview, firstTopic, firstStatus }. */
function groupByConversation(queries) {
  const byConv = new Map();
  for (const row of queries) {
    const cid = row.conversation_id != null ? String(row.conversation_id) : `single-${row.id}`;
    if (!byConv.has(cid)) {
      byConv.set(cid, {
        conversationId: cid,
        firstTs: row.ts,
        lastTs: row.ts,
        messageCount: 0,
        firstQueryPreview: row.query_text,
        firstTopic: row.topic,
        firstStatus: row.answer_status,
      });
    }
    const g = byConv.get(cid);
    g.messageCount += 1;
    g.lastTs = row.ts;
  }
  return Array.from(byConv.values()).sort((a, b) => {
    const tA = a.lastTs ? new Date(a.lastTs).getTime() : 0;
    const tB = b.lastTs ? new Date(b.lastTs).getTime() : 0;
    return tB - tA;
  });
}

function shortId(conversationId) {
  if (!conversationId || typeof conversationId !== "string") return "—";
  if (conversationId.startsWith("single-")) return conversationId;
  return conversationId.length > 12 ? conversationId.slice(-10) : conversationId;
}

export default function ConversationLogPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [customDateStart, setCustomDateStart] = useState(null);
  const [customDateEnd, setCustomDateEnd] = useState(null);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const conversations = groupByConversation(queries);

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { skip: 0, limit: 500 };
      if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
        params.from_date = customDateStart;
        params.to_date = customDateEnd;
      } else if (dateRangeFilter === "today") {
        params.on_date = todayStr;
      } else if (dateRangeFilter === "last7" || dateRangeFilter === "last30") {
        const days = dateRangeFilter === "last7" ? 7 : 30;
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - days);
        params.from_date = toDateString(start);
        params.to_date = toDateString(end);
      }
      const list = await searchQueriesApi.list(params);
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
  }, [dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  const handleSelectConversation = async (conversationId) => {
    if (conversationId.startsWith("single-")) {
      const id = parseInt(conversationId.replace("single-", ""), 10);
      const single = queries.find((q) => q.id === id);
      if (single) {
        setSelectedConversationId(conversationId);
        setConversationMessages([single]);
        setConversationError(null);
        return;
      }
    }
    setSelectedConversationId(conversationId);
    setConversationMessages([]);
    setConversationError(null);
    setLoadingConversation(true);
    try {
      const list = await searchQueriesApi.getByConversationId(conversationId);
      setConversationMessages(Array.isArray(list) ? list : []);
    } catch (e) {
      setConversationError(e?.message || "Failed to load conversation");
      setConversationMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedConversationId(null);
    setConversationMessages([]);
    setConversationError(null);
  };

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Conversation Log</h1>
          <div className="pageSub">Tracks user queries, responses, timestamps, and conversation performance analytics.
          </div>
        </div>
      </header>

      <section className="panel tablePanel conversationLogPanel">
        <div className="conversationLogSummary">
          {!loading && !error && (
            <span className="conversationLogSummaryText">
              Showing {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              {dateRangeSummary(dateRangeFilter, customDateStart, customDateEnd, todayStr)}
            </span>
          )}
          <div className="conversationLogSummaryActions">
            <DateRangeFilterDropdown
              dateRangeFilter={dateRangeFilter}
              onDateRangeFilterChange={setDateRangeFilter}
              customDateStart={customDateStart}
              customDateEnd={customDateEnd}
              onCustomRangeChange={(start, end) => {
                setCustomDateStart(start);
                setCustomDateEnd(end);
              }}
              open={dateRangeOpen}
              onOpenChange={setDateRangeOpen}
              triggerLabel="Date range"
              applyLabel="Apply range"
              wrapClassName="conversationLogDateDropdownWrap"
            />
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
          ) : conversations.length === 0 ? (
            <div className="conversationLogEmpty">
              <span className="conversationLogEmptyIcon"><IconMessage /></span>
              <p className="conversationLogEmptyTitle">No conversations yet</p>
              <p className="conversationLogEmptyText">
                Conversations will appear here after you run searches from Search/Upload or Intelligence Hub.
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
                  <th scope="col">Conversation</th>
                  <th scope="col">Started</th>
                  <th scope="col">Messages</th>
                  <th scope="col">First message</th>
                  <th scope="col">Status</th>
                  <th scope="col">Topic</th>
                  <th scope="col" className="conversationLogColAction" aria-label="View" />
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr
                    key={conv.conversationId}
                    className="conversationLogRow"
                    onClick={() => handleSelectConversation(conv.conversationId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectConversation(conv.conversationId);
                      }
                    }}
                    aria-label={`Open conversation ${shortId(conv.conversationId)}, ${conv.messageCount} messages`}
                  >
                    <td className="conversationLogConvId" title={conv.conversationId}>
                      {shortId(conv.conversationId)}
                    </td>
                    <td className="conversationLogTs">{formatTs(conv.firstTs)}</td>
                    <td className="conversationLogCount">{conv.messageCount}</td>
                    <td className="conversationLogQuery" title={conv.firstQueryPreview || undefined}>
                      {truncate(conv.firstQueryPreview, 50)}
                    </td>
                    <td>
                      <span className={`conversationLogStatus conversationLogStatus_${(conv.firstStatus || "unknown").replace(/[^a-z0-9]/gi, "_").toLowerCase()}`}>
                        {conv.firstStatus || "—"}
                      </span>
                    </td>
                    <td className="conversationLogTopic">{conv.firstTopic || "—"}</td>
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

      {selectedConversationId && (
        <div
          className="modalBackdrop conversationLogModalBackdrop"
          onClick={handleCloseModal}
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
                Conversation {shortId(selectedConversationId)}
              </h2>
              <button
                type="button"
                className="conversationLogModalClose"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="conversationLogModalMeta">
              {conversationMessages.length > 0 && (
                <>
                  <span className="conversationLogModalMetaItem">
                    {formatTs(conversationMessages[0].ts)}
                    {conversationMessages.length > 1 && ` – ${formatTs(conversationMessages[conversationMessages.length - 1].ts)}`}
                  </span>
                  <span className="conversationLogModalMetaItem">{conversationMessages.length} message pair{conversationMessages.length !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>
            <div className="conversationLogDetail">
              {loadingConversation ? (
                <div className="conversationLogLoading">
                  <div className="dashboardSpinner" aria-hidden />
                  <span>Loading conversation…</span>
                </div>
              ) : conversationError ? (
                <div className="conversationLogError" role="alert">
                  {conversationError}
                </div>
              ) : (
                <div className="conversationLogMessages">
                  {conversationMessages.map((msg) => (
                    <div key={msg.id} className="conversationLogMessagePair">
                      <div className="conversationLogMessage conversationLogMessageUser">
                        <div className="conversationLogMessageLabel">
                          <span className="conversationLogMessageRole">User</span>
                          <span className="conversationLogMessageTime">{formatTs(msg.ts)}</span>
                        </div>
                        <div className="conversationLogMessageContent">
                          {msg.query_text || "—"}
                        </div>
                      </div>
                      <div className="conversationLogMessage conversationLogMessageAssistant">
                        <div className="conversationLogMessageLabel">
                          <span className="conversationLogMessageRole">Assistant</span>
                          <span className="conversationLogMessageTime">Answer</span>
                        </div>
                        <div className="conversationLogMessageContent">
                          {msg.answer != null && msg.answer !== "" ? msg.answer : "— No answer stored —"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="conversationLogModalFooter">
              <button type="button" className="conversationLogBtn conversationLogBtnSecondary conversationLogModalCloseBtn" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
