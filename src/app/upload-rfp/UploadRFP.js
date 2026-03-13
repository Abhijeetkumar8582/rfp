"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { rfpQuestions as rfpQuestionsApi, activity as activityApi, search as searchApi, projects as projectsApi, rephrase as rephraseApi } from "../../lib/api";
import "../css/dashboard.css";
import "./UploadRFP.css";

/* Tab icons (outline, 18px) */
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const docTabs = [
  { id: "all", label: "All RFPs", icon: IconDoc },
  
];

/** Map tab id to API status filter (null = all). */
const tabToStatus = {
  all: null,
  draft: "Draft",
  approval: "For Approval",
  sent: "Sent",
  viewed: "Viewed",
  suggest: "Suggest Edits",
  completed: "Completed",
  expired: "Expired",
};

const RFP_PAGE_SIZE = 10;

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const statusPillClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "draft") return "docPill docPillDraft";
  if (s === "completed") return "docPill docPillCompleted";
  if (s === "sent") return "docPill docPillSent";
  if (s === "expired") return "docPill docPillExpired";
  return "docPill";
};

const VIEW_RFP_PAGE_SIZE = 10;

/** Backend returns this when no context was found for an answer (RFP GET empty slot). */
const NO_ARTICLES_MESSAGE = "Sorry No articles found";

/** Backend search/answer returns answer starting with this when no articles were found (see search_answer.py UNANSWERED_PREFIX). */
const UNANSWERED_PREFIX = "Unanswered : ";

function isUnansweredAnswer(a) {
  const s = (a ?? "").toString().trim();
  if (s === "" || s === NO_ARTICLES_MESSAGE) return true;
  if (s.startsWith(UNANSWERED_PREFIX)) return true;
  return false;
}

/** Format answer for display in Bulk Questions: prefix/suffix when it's an unanswered-style response. */
function formatBulkAnswerDisplay(answer) {
  const s = (answer ?? "").toString().trim();
  if (!s) return "";
  if (s.startsWith("The passages do not specify")) {
    return `Unanswered: ${s} This would be difficult.`;
  }
  return s;
}

/** Modal to view a single RFP (questions/answers) — fetches by rfpid, shows table. Inline edit for one answer at a time. */
function ViewRfpModal({ rfpid, onClose }) {
  const [rfp, setRfp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [rephraseError, setRephraseError] = useState(null);
  const [viewRfpPage, setViewRfpPage] = useState(1);

  useEffect(() => {
    if (!rfpid) {
      setRfp(null);
      setLoading(false);
      setEditingIndex(null);
      setViewRfpPage(1);
      return;
    }
    setLoading(true);
    setError(null);
    setEditingIndex(null);
    setViewRfpPage(1);
    rfpQuestionsApi.get(rfpid)
      .then((data) => {
        setRfp(data);
        setError(null);
      })
      .catch((err) => setError(err?.message || "Failed to load RFP"))
      .finally(() => setLoading(false));
  }, [rfpid]);

  const startEdit = (i, currentAnswer) => {
    setEditingIndex(i);
    setEditDraft(currentAnswer ?? "");
    setSaveError(null);
    setRephraseError(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setSaveError(null);
    setRephraseError(null);
  };

  const handleRephrase = async () => {
    const text = (editDraft || "").trim();
    if (!text || editingIndex == null) return;
    const question = (questions[editingIndex] ?? "").trim() || "Question";
    setRephraseError(null);
    setRephrasing(true);
    try {
      const res = await rephraseApi.rephrase(question, text);
      setEditDraft(res.rephrased_answer ?? text);
    } catch (err) {
      setRephraseError(err?.message || "Rephrase failed");
    } finally {
      setRephrasing(false);
    }
  };

  const saveEdit = async () => {
    if (rfp == null || editingIndex == null) return;
    const questions = Array.isArray(rfp.questions) ? rfp.questions : [];
    const answers = Array.isArray(rfp.answers) ? rfp.answers : [];
    const newAnswers = questions.map((_, idx) =>
      idx === editingIndex ? editDraft : (answers[idx] ?? "")
    );
    setSaving(true);
    setSaveError(null);
    try {
      await rfpQuestionsApi.updateAnswers(rfpid, newAnswers);
      setRfp({ ...rfp, answers: newAnswers });
      setEditingIndex(null);
    } catch (err) {
      setSaveError(err?.message || "Failed to save answer");
    } finally {
      setSaving(false);
    }
  };

  if (!rfpid) return null;
  const recipients = (rfp && Array.isArray(rfp.recipients) ? rfp.recipients : []);
  const questions = (rfp && Array.isArray(rfp.questions) ? rfp.questions : []);
  const answers = (rfp && Array.isArray(rfp.answers) ? rfp.answers : []);
  const totalViewRfpPages = Math.max(1, Math.ceil(questions.length / VIEW_RFP_PAGE_SIZE));
  const viewRfpStart = (viewRfpPage - 1) * VIEW_RFP_PAGE_SIZE;
  const viewRfpEnd = Math.min(viewRfpStart + VIEW_RFP_PAGE_SIZE, questions.length);
  const rowIndices = [];
  for (let i = viewRfpStart; i < viewRfpEnd; i++) rowIndices.push(i);

  return (
    <div className="uploadModalOverlay" role="dialog" aria-modal="true" aria-label="RFP details">
      <div className="uploadModalBackdrop" onClick={onClose} aria-hidden="true" />
      <div className="uploadModalPanel questionsModalPanel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960 }}>
        <div className="uploadModalHeader questionsModalHeader">
          <h2>{rfp?.name ?? "RFP"}</h2>
          <button type="button" className="uploadModalClose" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="uploadModalBody questionsModalBody viewRfpModalBody" style={{ padding: "16px 24px" }}>
          {loading && <div className="docEmptyState">Loading…</div>}
          {error && <div className="uploadModalError" style={{ marginBottom: 12 }}>{error}</div>}
          {!loading && rfp && (
            <>
              {/* RFP summary metrics: blue (accuracy), green (answered), red (unanswered) */}
              <div className="viewRfpMetrics">
                <div className="viewRfpMetric viewRfpMetricAccuracy">
                  <span className="viewRfpMetricLabel">Average accuracy</span>
                  <span className="viewRfpMetricValue">{rfp.average_accuracy != null ? `${Math.round(Number(rfp.average_accuracy) * 100)}%` : "—"}</span>
                </div>
                <div className="viewRfpMetric viewRfpMetricAnswered">
                  <span className="viewRfpMetricLabel">Total answered</span>
                  <span className="viewRfpMetricValue">{questions.filter((_, i) => !isUnansweredAnswer(answers[i])).length}</span>
                </div>
                <div className="viewRfpMetric viewRfpMetricUnanswered">
                  <span className="viewRfpMetricLabel">Total unanswered</span>
                  <span className="viewRfpMetricValue">{questions.filter((_, i) => isUnansweredAnswer(answers[i])).length}</span>
                </div>
              </div>
              <dl style={{ margin: "0 0 16px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 14 }}>
                <dt style={{ color: "#666" }}>Created</dt>
                <dd style={{ margin: 0 }}>{formatDate(rfp.created_at)}</dd>
                <dt style={{ color: "#666" }}>Last activity</dt>
                <dd style={{ margin: 0 }}>{formatDate(rfp.last_activity_at)}</dd>
                <dt style={{ color: "#666" }}>Status</dt>
                <dd style={{ margin: 0 }}><span className={statusPillClass(rfp.status)}>{rfp.status}</span></dd>
                {recipients.length > 0 && (<><dt style={{ color: "#666" }}>Recipients</dt><dd style={{ margin: 0 }}>{recipients.join(", ")}</dd></>)}
              </dl>
              {questions.length > 0 ? (
                <div className="questionsTableWrap" style={{ marginTop: 16 }}>
                  <table className="questionsTable">
                    <thead>
                      <tr>
                        <th className="questionsThQuestion">Question</th>
                        <th className="questionsThAnswer">Answer</th>
                        <th className="questionsThActions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowIndices.map((i) => (
                        <tr key={i}>
                          <td className="questionsTdQuestion">{questions[i]}</td>
                          <td className="questionsTdAnswer">
                            {editingIndex === i ? (
                              <div className="viewRfpEditAnswerWrap">
                                <textarea
                                  className="viewRfpEditAnswerInput"
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  placeholder="Enter answer…"
                                  rows={4}
                                  autoFocus
                                />
                                {saveError && <div className="uploadModalError" style={{ marginTop: 8, marginBottom: 8 }}>{saveError}</div>}
                                {rephraseError && <div className="uploadModalError" style={{ marginTop: 8, marginBottom: 8 }}>{rephraseError}</div>}
                                <div className="viewRfpEditAnswerActions">
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button type="button" className="ghostBtn" onClick={cancelEdit} disabled={saving}>Cancel</button>
                                    <button type="button" className="primaryBtn primaryBtnPurple" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                                  </div>
                                  <div className="viewRfpRephraseWrap" title="Rephrase text">
                                    <button
                                      type="button"
                                      className="viewRfpRephraseBtn"
                                      title="Rephrase text"
                                      onClick={handleRephrase}
                                      disabled={saving || rephrasing || !(editDraft || "").trim()}
                                      aria-label="Rephrase text"
                                    >
                                      {rephrasing ? (
                                        <span className="viewRfpRephraseSpinner" aria-hidden>⟳</span>
                                      ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              answers[i] ?? "—"
                            )}
                          </td>
                          <td className="questionsTdActions">
                            {editingIndex === i ? null : (
                              <button type="button" className="docViewLink" onClick={() => startEdit(i, answers[i])}>Edit</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {questions.length > VIEW_RFP_PAGE_SIZE && (
                    <div className="questionsPagination" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="ghostBtn questionsPageBtn"
                        disabled={viewRfpPage <= 1}
                        onClick={() => setViewRfpPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="questionsPageInfo">
                        Page {viewRfpPage} of {totalViewRfpPages} ({questions.length} questions)
                      </span>
                      <button
                        type="button"
                        className="ghostBtn questionsPageBtn"
                        disabled={viewRfpPage >= totalViewRfpPages}
                        onClick={() => setViewRfpPage((p) => Math.min(totalViewRfpPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="docEmptyState" style={{ marginTop: 16 }}>No questions in this RFP.</div>
              )}
              <div className="uploadModalActions" style={{ marginTop: 20 }}>
                <button type="button" className="ghostBtn" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Name filter dropdown: search bar + list of names; filter table on select */
function NameFilterDropdown({ docs, nameFilter, onNameFilterChange, open, onOpenChange }) {
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const uniqueNames = React.useMemo(() => {
    const names = [...new Set((docs || []).map((d) => (d.name || "").trim()).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [docs]);

  const filteredNames = React.useMemo(() => {
    if (!search.trim()) return uniqueNames;
    const q = search.trim().toLowerCase();
    return uniqueNames.filter((n) => n.toLowerCase().includes(q));
  }, [uniqueNames, search]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onOpenChange(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div className="docFilterDropdownWrap" ref={ref}>
      <button
        type="button"
        className="docSelect docFilterDropdownTrigger"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filter by name"
      >
        Name <span className="docFilterDropdownCaret">▼</span>
      </button>
      {open && (
        <div className="docFilterDropdownPanel docNameFilterPanel" role="listbox">
          <div className="docFilterDropdownSearchWrap">
            <input
              type="text"
              className="docFilterDropdownSearch"
              placeholder="Search names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              aria-label="Search names"
            />
          </div>
          <div className="docFilterDropdownList">
            <button
              type="button"
              className={`docFilterDropdownItem ${nameFilter == null ? "docFilterDropdownItemActive" : ""}`}
              onClick={() => { onNameFilterChange(null); onOpenChange(false); }}
              role="option"
              aria-selected={nameFilter == null}
            >
              All names
            </button>
            {filteredNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`docFilterDropdownItem ${nameFilter === name ? "docFilterDropdownItemActive" : ""}`}
                onClick={() => { onNameFilterChange(name); onOpenChange(false); }}
                role="option"
                aria-selected={nameFilter === name}
              >
                {name}
              </button>
            ))}
            {filteredNames.length === 0 && <div className="docFilterDropdownEmpty">No names match</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Build calendar grid for a month (weeks of 7 days, Sun–Sat). Each cell: { date, currentMonth }. */
function getCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const grid = [];
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();
  let day = 1;
  let nextMonthDay = 1;
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      const i = row * 7 + col;
      if (i < startDay) {
        const d = prevLast - startDay + i + 1;
        week.push({ date: d, currentMonth: false, year: prevYear, month: prevMonth });
      } else if (day <= daysInMonth) {
        week.push({ date: day, currentMonth: true, year, month });
        day++;
      } else {
        week.push({ date: nextMonthDay, currentMonth: false, year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 });
        nextMonthDay++;
      }
    }
    grid.push(week);
  }
  return grid;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format YYYY-MM-DD from Date */
function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const YEAR_RANGE_SIZE = 12;
function getYearRange(centerYear) {
  const start = Math.floor(centerYear / YEAR_RANGE_SIZE) * YEAR_RANGE_SIZE;
  return Array.from({ length: YEAR_RANGE_SIZE }, (_, i) => start + i);
}

/** Single calendar for start or end date: day view, month picker (3x4), year picker. Optional range for highlighting.
 *  onDoubleClickSelect: when provided, double-click sets both start and end to that date (single-day selection).
 *  isStartCalendar: when true, clicking a month in month view sets date to first day of month; when false, to last day (for month range). */
function MiniCalendar({ label, selectedDate, onSelect, monthState, onMonthChange, rangeStartDate, rangeEndDate, onDoubleClickSelect, isStartCalendar }) {
  const [view, setView] = useState("days");

  const grid = getCalendarGrid(monthState.year, monthState.month);
  const yearRange = React.useMemo(() => getYearRange(monthState.year), [monthState.year]);

  const [rangeStart, rangeEnd] = React.useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [null, null];
    const a = rangeStartDate;
    const b = rangeEndDate;
    return a <= b ? [a, b] : [b, a];
  }, [rangeStartDate, rangeEndDate]);

  const handleSelectMonth = (monthIndex) => {
    const year = monthState.year;
    const monthStr = String(monthIndex + 1).padStart(2, "0");
    const dateStr = isStartCalendar
      ? `${year}-${monthStr}-01`
      : `${year}-${monthStr}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
    onSelect(dateStr);
    onMonthChange({ year, month: monthIndex });
    setView("days");
  };

  const handleSelectYear = (year) => {
    onMonthChange({ year, month: monthState.month });
    setView("months");
  };

  return (
    <div className="docDateSingleCalendar">
      <div className="docDateCalendarHeader">
        {view === "days" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }))}
              aria-label={`Previous month (${label})`}
            >
              ‹
            </button>
            <span className="docDateCalendarMonthLabel docDateCalendarClickable">
              <button type="button" className="docDateCalendarHeaderMonth" onClick={() => setView("months")}>
                {MONTHS[monthState.month]}
              </button>
              {" "}
              <button type="button" className="docDateCalendarHeaderYear" onClick={() => setView("years")}>
                {monthState.year}
              </button>
            </span>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }))}
              aria-label={`Next month (${label})`}
            >
              ›
            </button>
          </>
        )}
        {view === "months" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year - 1 }))}
              aria-label={`Previous year (${label})`}
            >
              ‹
            </button>
            <button type="button" className="docDateCalendarMonthLabel docDateCalendarHeaderYearOnly" onClick={() => setView("years")}>
              {monthState.year}
            </button>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year + 1 }))}
              aria-label={`Next year (${label})`}
            >
              ›
            </button>
          </>
        )}
        {view === "years" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year - YEAR_RANGE_SIZE }))}
              aria-label={`Previous years (${label})`}
            >
              ‹
            </button>
            <span className="docDateCalendarMonthLabel">
              {yearRange[0]} – {yearRange[yearRange.length - 1]}
            </span>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year + YEAR_RANGE_SIZE }))}
              aria-label={`Next years (${label})`}
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="docDateCalendarSubLabel">{label}</div>

      {view === "days" && (
        <table className="docDateCalendarTable" role="grid" aria-label={`${label} calendar`}>
          <thead>
            <tr>
              {WEEKDAYS.map((wd) => (
                <th key={wd} className="docDateCalendarWeekday" scope="col">{wd}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) => {
                  const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.date).padStart(2, "0")}`;
                  const isSelected = selectedDate === dateStr;
                  const isRangeStart = rangeStart && rangeEnd && dateStr === rangeStart;
                  const isRangeEnd = rangeStart && rangeEnd && dateStr === rangeEnd;
                  const isInRange = rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd;
                  const rangeClass = isRangeStart && isRangeEnd
                    ? "docDateCalendarDayRangeStart docDateCalendarDayRangeEnd"
                    : isRangeStart
                      ? "docDateCalendarDayRangeStart"
                      : isRangeEnd
                        ? "docDateCalendarDayRangeEnd"
                        : isInRange
                          ? "docDateCalendarDayInRange"
                          : "";
                  const selectedClass = (rangeStart && rangeEnd) ? "" : (!rangeClass && isSelected ? "docDateCalendarDaySelected" : "");
                  return (
                    <td key={ci} className="docDateCalendarCell">
                      <button
                        type="button"
                        className={`docDateCalendarDay ${!cell.currentMonth ? "docDateCalendarDayOther" : ""} ${rangeClass} ${selectedClass}`}
                        onClick={() => onSelect(dateStr)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          if (onDoubleClickSelect) onDoubleClickSelect(dateStr);
                          else onSelect(dateStr);
                        }}
                        aria-pressed={isSelected || isInRange}
                        aria-label={`${cell.date} ${MONTHS[cell.month]} ${cell.year}`}
                      >
                        {cell.date}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "months" && (
        <div className="docDateMonthGrid" role="grid" aria-label={`Select month (${label})`}>
          {MONTHS_SHORT.map((name, index) => {
            const isSelected = monthState.month === index;
            return (
              <button
                key={name}
                type="button"
                className={`docDateMonthGridItem ${isSelected ? "docDateCalendarDaySelected" : ""}`}
                onClick={() => handleSelectMonth(index)}
                aria-pressed={isSelected}
                aria-label={`${MONTHS[index]} ${monthState.year}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {view === "years" && (
        <div className="docDateYearGrid" role="grid" aria-label={`Select year (${label})`}>
          {yearRange.map((y) => {
            const isSelected = monthState.year === y;
            return (
              <button
                key={y}
                type="button"
                className={`docDateYearGridItem ${isSelected ? "docDateCalendarDaySelected" : ""}`}
                onClick={() => handleSelectYear(y)}
                aria-pressed={isSelected}
                aria-label={`Year ${y}`}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Date range filter dropdown: quick buttons + two calendars (start & end), default today */
function DateFilterDropdown({
  dateRangeFilter,
  onDateRangeFilterChange,
  customDateStart,
  customDateEnd,
  onCustomRangeChange,
  open,
  onOpenChange,
}) {
  const ref = useRef(null);
  const todayStr = React.useMemo(() => toDateString(new Date()), []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [monthEnd, setMonthEnd] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onOpenChange(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
        setStartDate(customDateStart);
        setEndDate(customDateEnd);
        const [ys, ms] = customDateStart.split("-").map(Number);
        setMonthStart({ year: ys, month: (ms || 1) - 1 });
        const [ye, me] = customDateEnd.split("-").map(Number);
        setMonthEnd({ year: ye, month: (me || 1) - 1 });
      } else {
        const d = new Date();
        setStartDate(todayStr);
        setEndDate(null);
        setMonthStart({ year: d.getFullYear(), month: d.getMonth() });
        const nextMonth = d.getMonth() === 11 ? new Date(d.getFullYear() + 1, 0, 1) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
        setMonthEnd({ year: nextMonth.getFullYear(), month: nextMonth.getMonth() });
      }
    }
  }, [open, dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  const options = [
    { id: "today", label: "Today" },
    { id: "last7", label: "Last 7 days" },
    { id: "last30", label: "Last 30 days" },
  ];

  const handleApplyRange = () => {
    const start = startDate || todayStr;
    const end = endDate || start;
    const [s, e] = [start, end].sort();
    onCustomRangeChange(s, e);
    onDateRangeFilterChange("custom");
    onOpenChange(false);
  };

  return (
    <div className="docFilterDropdownWrap" ref={ref}>
      <button
        type="button"
        className="docSelect docFilterDropdownTrigger"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Filter by date"
      >
        Date <span className="docFilterDropdownCaret">▼</span>
      </button>
      {open && (
        <div className="docFilterDropdownPanel docDateFilterPanel docDateFilterPanelWithCalendar" role="dialog" aria-label="Date range filter">
          <div className="docDateFilterLayout">
            <div className="docDateFilterButtons">
              <button
                type="button"
                className={`docDateFilterBtn ${dateRangeFilter == null ? "docDateFilterBtnActive" : ""}`}
                onClick={() => { onDateRangeFilterChange(null); onCustomRangeChange(null, null); onOpenChange(false); }}
                role="option"
                aria-selected={dateRangeFilter == null}
              >
                All dates
              </button>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`docDateFilterBtn ${dateRangeFilter === opt.id ? "docDateFilterBtnActive" : ""}`}
                  onClick={() => { onDateRangeFilterChange(opt.id); onCustomRangeChange(null, null); onOpenChange(false); }}
                  role="option"
                  aria-selected={dateRangeFilter === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="docDateCalendarsRow">
              <MiniCalendar
                label="Start date"
                selectedDate={startDate}
                onSelect={setStartDate}
                monthState={monthStart}
                onMonthChange={setMonthStart}
                rangeStartDate={startDate && endDate ? startDate : null}
                rangeEndDate={startDate && endDate ? endDate : null}
                onDoubleClickSelect={(dateStr) => { setStartDate(dateStr); setEndDate(dateStr); }}
                isStartCalendar={true}
              />
              <MiniCalendar
                label="End date"
                selectedDate={endDate}
                onSelect={setEndDate}
                monthState={monthEnd}
                onMonthChange={setMonthEnd}
                rangeStartDate={startDate && endDate ? startDate : null}
                rangeEndDate={startDate && endDate ? endDate : null}
                onDoubleClickSelect={(dateStr) => { setStartDate(dateStr); setEndDate(dateStr); }}
                isStartCalendar={false}
              />
            </div>
          </div>
          <div className="docDateFilterApplyWrap">
            <button type="button" className="docDateFilterApplyBtn" onClick={handleApplyRange}>
              Apply range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function UploadRFP() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [listView, setListView] = useState(true); /* false = grid (box) as default */

  const [docs, setDocs] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [rfpPage, setRfpPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const fetchRfps = React.useCallback(async (override = {}) => {
    if (!user?.id) {
      setDocs([]);
      setTotalDocs(0);
      return;
    }
    const page = override.page ?? rfpPage;
    setLoading(true);
    setListError("");
    try {
      const skip = (page - 1) * RFP_PAGE_SIZE;
      const status = tabToStatus[activeTab] ?? null;
      const res = await rfpQuestionsApi.list({
        skip,
        limit: RFP_PAGE_SIZE,
        user_id: user.id,
        status: status ?? undefined,
      });
      setDocs(res.items ?? []);
      setTotalDocs(res.total ?? 0);
      if (override.page != null) setRfpPage(override.page);
    } catch (err) {
      setListError(err?.message || "Failed to load RFPs.");
      setDocs([]);
      setTotalDocs(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id, rfpPage, activeTab]);

  useEffect(() => {
    fetchRfps();
  }, [fetchRfps]);

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "My RFPs",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  const [showUploadBulkModal, setShowUploadBulkModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState([]);
  const [currentRfpid, setCurrentRfpid] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [questionsPage, setQuestionsPage] = useState(1);
  const bulkFileInputRef = useRef(null);

  const [bulkProjects, setBulkProjects] = useState([]);
  const [bulkProjectId, setBulkProjectId] = useState(null);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [advanceSearchEnabled, setAdvanceSearchEnabled] = useState(false);
  const [reasoningResponseEnabled, setReasoningResponseEnabled] = useState(false);
  const [infoReasoningOpen, setInfoReasoningOpen] = useState(false);
  const [infoAdvanceOpen, setInfoAdvanceOpen] = useState(false);

  // My RFPs table: view single RFP modal, 3-dot menu open state (rfpid)
  const [rfpViewRfpid, setRfpViewRfpid] = useState(null);
  const [openKebabRfpid, setOpenKebabRfpid] = useState(null);
  const kebabRef = useRef(null);

  // Toolbar filters: Name (search + select) and Date (range: start/end, default today)
  const [nameFilter, setNameFilter] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [customDateStart, setCustomDateStart] = useState(null);
  const [customDateEnd, setCustomDateEnd] = useState(null);
  const [openNameDropdown, setOpenNameDropdown] = useState(false);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);

  const filteredDocs = React.useMemo(() => {
    let list = docs || [];
    if (nameFilter) {
      list = list.filter((d) => (d.name || "").trim() === nameFilter);
    }
    if (dateRangeFilter) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      list = list.filter((d) => {
        const dt = d.last_activity_at || d.created_at;
        if (!dt) return false;
        const t = new Date(dt).getTime();
        if (dateRangeFilter === "today") return t >= todayStart;
        if (dateRangeFilter === "last7") return t >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
        if (dateRangeFilter === "last30") return t >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
        if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
          const [ys, ms, ds] = customDateStart.split("-").map(Number);
          const [ye, me, de] = customDateEnd.split("-").map(Number);
          const rangeStart = new Date(ys, (ms || 1) - 1, ds || 1, 0, 0, 0, 0).getTime();
          const rangeEnd = new Date(ye, (me || 1) - 1, de || 1, 23, 59, 59, 999).getTime();
          return t >= rangeStart && t <= rangeEnd;
        }
        return true;
      });
    }
    return list;
  }, [docs, nameFilter, dateRangeFilter, customDateStart, customDateEnd]);

  const handleCustomRangeChange = React.useCallback((start, end) => {
    setCustomDateStart(start);
    setCustomDateEnd(end);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setOpenKebabRfpid(null);
    }
    if (openKebabRfpid != null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openKebabRfpid]);

  function openUploadBulk() {
    setUploadError("");
    setSelectedFile(null);
    setShowUploadBulkModal(true);
  }

  function onBulkFileChange(e) {
    const file = e.target.files?.[0];
    setUploadError("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setUploadError("Please upload an Excel file (.xlsx, .xls) or CSV.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    e.target.value = "";
  }

  function onBulkDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    setUploadError("");
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setUploadError("Please upload an Excel file (.xlsx, .xls) or CSV.");
      return;
    }
    setSelectedFile(file);
  }

  function onBulkDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function parseExcelFirstColumn(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const questions = [];
          for (let i = 0; i < rows.length; i++) {
            const cell = rows[i][0];
            const text = cell != null ? String(cell).trim() : "";
            if (text) questions.push({ id: i + 1, question: text, answer: "" });
          }
          resolve(questions);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleBulkSave() {
    if (!selectedFile) {
      setUploadError("Please select an Excel or CSV file first.");
      return;
    }
    if (!user?.id) {
      setUploadError("Please sign in to upload questions.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const result = await rfpQuestionsApi.importQuestions(user.id, selectedFile);
      const questions = await parseExcelFirstColumn(selectedFile);
      if (questions.length === 0) {
        setUploadError("No questions found in the first column.");
        setUploading(false);
        return;
      }
      setCurrentRfpid(result.rfpid);
      setBulkQuestions(questions);
      setQuestionsPage(1);
      setShowUploadBulkModal(false);
      setShowQuestionsModal(true);
      fetchRfps({ page: 1 });
      try {
        await activityApi.create({
          actor: user?.name || user?.email || "User",
          event_action: "RFP questions imported",
          target_resource: selectedFile?.name ? `File: ${selectedFile.name}` : "RFP questions",
          severity: "info",
          system: "web",
        });
      } catch {
        /* non-blocking */
      }
    } catch (err) {
      setUploadError(err?.message || "Failed to upload questions.");
    } finally {
      setUploading(false);
    }
  }

  function closeUploadBulkModal() {
    setShowUploadBulkModal(false);
    setSelectedFile(null);
    setUploadError("");
    setInfoReasoningOpen(false);
    setInfoAdvanceOpen(false);
  }

  function closeQuestionsModal() {
    setShowQuestionsModal(false);
    setBulkQuestions([]);
    setCurrentRfpid(null);
    setQuestionsPage(1);
    setGenerateError("");
    setGeneratingAnswers(false);
    setInfoReasoningOpen(false);
    setInfoAdvanceOpen(false);
  }

  useEffect(() => {
    if (showQuestionsModal && bulkProjects.length === 0) {
      projectsApi.list().then((list) => {
        setBulkProjects(list ?? []);
        if (list?.length && bulkProjectId == null) setBulkProjectId(list[0].id);
      }).catch(() => setBulkProjects([]));
    }
  }, [showQuestionsModal]);

  async function handleGenerateAnswers() {
    const projectId = bulkProjectId ?? bulkProjects[0]?.id;
    if (projectId == null) {
      setGenerateError("Select a project to search. Add projects and documents in File Repository first.");
      return;
    }
    if (bulkQuestions.length === 0) {
      setGenerateError("No questions to generate answers for.");
      return;
    }
    setGenerateError("");
    setGeneratingAnswers(true);
    const answers = [];
    const confidenceList = [];
    for (let i = 0; i < bulkQuestions.length; i++) {
      setGeneratingIndex(i + 1);
      const row = bulkQuestions[i];
      const q = (row.question || "").trim();
      if (!q) {
        answers.push(row.answer ?? "");
        confidenceList.push(0);
        continue;
      }
      try {
        let res;
        if (reasoningResponseEnabled) {
          res = await searchApi.reasoning(q, projectId, { k: 20, top_k: 12, advanced_search: advanceSearchEnabled });
        } else {
          res = await searchApi.answer(q, projectId, 10, { advanced_search: advanceSearchEnabled });
        }
        const answer = res?.answer ?? "";
        const conf = res?.confidence?.overall;
        const confNum = typeof conf === "number" && !Number.isNaN(conf) ? conf : 0;
        answers.push(answer);
        confidenceList.push(confNum);
        setBulkQuestions((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, answer } : item
          )
        );
      } catch (err) {
        const msg = err?.message || "Search failed.";
        answers.push(`[Error: ${msg}]`);
        confidenceList.push(0);
        setBulkQuestions((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, answer: `[Error: ${msg}]` } : item
          )
        );
      }
    }
    if (currentRfpid && answers.length > 0) {
      try {
        await rfpQuestionsApi.updateAnswers(currentRfpid, answers, confidenceList);
      } catch (err) {
        setGenerateError(err?.message || "Failed to save answers to the server.");
      }
    }
    setGeneratingAnswers(false);
    setGeneratingIndex(0);
  }

  const totalPages = Math.max(1, Math.ceil(bulkQuestions.length / PAGE_SIZE));
  const startIdx = (questionsPage - 1) * PAGE_SIZE;
  const paginatedQuestions = bulkQuestions.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <>
      <header className="docPageHeader">
        <h1 className="pageTitle">My RFPs</h1>
        <div className="docHeaderActions">
          <button type="button" className="uploadBulkQuestionBtn" onClick={openUploadBulk}>
            Upload RFP
          </button>
        </div>
      </header>
      <p className="docPageHint" style={{ marginBottom: 16, color: "#666", fontSize: 14 }}>
        To add documents for chunking and semantic search, use{" "}
        <Link href="/filerepo" style={{ color: "var(--primaryPurple, #6366f1)", fontWeight: 500 }}>File Repository</Link>.
      </p>

      <nav className="docTabs">
        {docTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`docTab ${activeTab === id ? "docTabActive" : ""}`}
            onClick={() => { setActiveTab(id); setRfpPage(1); }}
          >
            <span className="docTabIcon"><Icon /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="docToolbar">
        <div className="docToolbarLeft">
          <NameFilterDropdown
            docs={docs}
            nameFilter={nameFilter}
            onNameFilterChange={setNameFilter}
            open={openNameDropdown}
            onOpenChange={setOpenNameDropdown}
          />
          <DateFilterDropdown
            dateRangeFilter={dateRangeFilter}
            onDateRangeFilterChange={setDateRangeFilter}
            customDateStart={customDateStart}
            customDateEnd={customDateEnd}
            onCustomRangeChange={handleCustomRangeChange}
            open={openDateDropdown}
            onOpenChange={setOpenDateDropdown}
          />
          <button type="button" className="docMoreFiltersBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
            More Filters
          </button>
        </div>
        <div className="docToolbarRight">
          <div className="searchWrap docSearch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input className="searchInput" placeholder="Search..." />
          </div>
          <div className="docViewToggle">
            <button type="button" className={`docViewBtn ${!listView ? "docViewBtnActive" : ""}`} onClick={() => setListView(false)} aria-label="Grid view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </button>
            <button type="button" className={`docViewBtn ${listView ? "docViewBtnActive" : ""}`} onClick={() => setListView(true)} aria-label="List view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
        </div>
      </div>

      {listError && (
        <div className="docListError" role="alert">{listError}</div>
      )}
      {listView ? (
        <div className="docTableWrap">
          <table className="docTable">
            <thead>
              <tr>
                <th className="docThCheck" />
                <th className="docThName">Name</th>
                <th className="docThActivity">Last Activity</th>
                <th className="docThRecipients">Recipients</th>
                <th className="docThStatus">Status</th>
                <th className="docThActions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="docEmptyState">
                    Loading RFPs…
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="docEmptyState">
                    {docs.length === 0 ? "No RFPs found. Upload a bulk question to get started." : "No RFPs match the current filters."}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="docTdCheck">
                      <input type="checkbox" className="docCheckbox" aria-label={`Select ${doc.name}`} />
                    </td>
                    <td className="docTdName">
                      <span className="docCellIcon">
                        <IconDoc />
                      </span>
                      <div className="docCellNameBlock">
                        <span className="docCellTitle">{doc.name}</span>
                        <span className="docCellMeta">Created: {formatDate(doc.created_at)}</span>
                      </div>
                    </td>
                    <td className="docTdActivity">{formatDate(doc.last_activity_at)}</td>
                    <td className="docTdRecipients">
                      <div className="docAvatars">
                        {(Array.isArray(doc.recipients) ? doc.recipients : []).map((r, i) => (
                          <span key={i} className="docAvatar" title={r}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="docTdStatus">
                      <span className={statusPillClass(doc.status)}>{doc.status}</span>
                    </td>
                    <td className="docTdActions">
                      <button type="button" className="docViewLink" onClick={() => setRfpViewRfpid(doc.rfpid)}>View</button>
                      <div className="docKebabWrap" ref={openKebabRfpid === doc.rfpid ? kebabRef : null} style={{ position: "relative", display: "inline-block" }}>
                        <button
                          type="button"
                          className="kebab docKebab"
                          aria-label="More actions"
                          aria-expanded={openKebabRfpid === doc.rfpid}
                          onClick={(e) => { e.stopPropagation(); setOpenKebabRfpid((prev) => (prev === doc.rfpid ? null : doc.rfpid)); }}
                        >
                          ⋯
                        </button>
                        {openKebabRfpid === doc.rfpid && (
                          <div className="docKebabDropdown" role="menu">
                            <button
                              type="button"
                              className="docKebabItem docKebabItemDanger"
                              role="menuitem"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
                                try {
                                  await rfpQuestionsApi.delete(doc.rfpid);
                                  setOpenKebabRfpid(null);
                                  if (rfpViewRfpid === doc.rfpid) setRfpViewRfpid(null);
                                  fetchRfps();
                                } catch (err) {
                                  setListError(err?.message || "Delete failed");
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="docGridWrap">
          {loading ? (
            <div className="docGridEmptyState">Loading RFPs…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="docGridEmptyState">
              {docs.length === 0 ? "No RFPs found. Upload a bulk question to get started." : "No RFPs match the current filters."}
            </div>
          ) : (
            <div className="docGrid">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="docGridCard">
                  <div className="docGridCardHeader">
                    <input type="checkbox" className="docCheckbox" aria-label={`Select ${doc.name}`} />
                    <span className="docGridCardIcon">
                      <IconDoc />
                    </span>
                    <div className="docGridCardNameBlock">
                      <span className="docGridCardTitle">{doc.name}</span>
                      <span className="docGridCardMeta">Created: {formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <div className="docGridCardBody">
                    <div className="docGridCardRow">
                      <span className="docGridCardLabel">Last Activity</span>
                      <span className="docGridCardValue">{formatDate(doc.last_activity_at)}</span>
                    </div>
                    <div className="docGridCardRow">
                      <span className="docGridCardLabel">Recipients</span>
                      <div className="docAvatars docGridCardAvatars">
                        {(Array.isArray(doc.recipients) ? doc.recipients : []).length > 0
                          ? (doc.recipients || []).map((r, i) => (
                              <span key={i} className="docAvatar" title={r}>{r}</span>
                            ))
                          : <span className="docGridCardValue docGridCardMuted">—</span>}
                      </div>
                    </div>
                    <div className="docGridCardRow docGridCardRowStatus">
                      <span className="docGridCardLabel">Status</span>
                      <span className={statusPillClass(doc.status)}>{doc.status}</span>
                    </div>
                  </div>
                  <div className="docGridCardActions">
                    <button type="button" className="docViewLink" onClick={() => setRfpViewRfpid(doc.rfpid)}>View</button>
                    <div className="docKebabWrap" ref={openKebabRfpid === doc.rfpid ? kebabRef : null} style={{ position: "relative", display: "inline-block" }}>
                      <button
                        type="button"
                        className="kebab docKebab"
                        aria-label="More actions"
                        aria-expanded={openKebabRfpid === doc.rfpid}
                        onClick={(e) => { e.stopPropagation(); setOpenKebabRfpid((prev) => (prev === doc.rfpid ? null : doc.rfpid)); }}
                      >
                        ⋯
                      </button>
                      {openKebabRfpid === doc.rfpid && (
                        <div className="docKebabDropdown docKebabDropdownGrid" role="menu">
                          <button
                            type="button"
                            className="docKebabItem docKebabItemDanger"
                            role="menuitem"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
                              try {
                                await rfpQuestionsApi.delete(doc.rfpid);
                                setOpenKebabRfpid(null);
                                if (rfpViewRfpid === doc.rfpid) setRfpViewRfpid(null);
                                fetchRfps();
                              } catch (err) {
                                setListError(err?.message || "Delete failed");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {rfpViewRfpid && (
        <ViewRfpModal rfpid={rfpViewRfpid} onClose={() => setRfpViewRfpid(null)} />
      )}

      {!loading && totalDocs > 0 && (
        <div className="questionsPagination" style={{ marginTop: 16, justifyContent: "center", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="ghostBtn questionsPageBtn"
            disabled={rfpPage <= 1}
            onClick={() => setRfpPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="questionsPageInfo">
            Page {rfpPage} of {Math.max(1, Math.ceil(totalDocs / RFP_PAGE_SIZE))} ({totalDocs} RFP{totalDocs !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="ghostBtn questionsPageBtn"
            disabled={rfpPage >= Math.ceil(totalDocs / RFP_PAGE_SIZE)}
            onClick={() => setRfpPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Upload Bulk Question modal */}
      {showUploadBulkModal && (
        <div className="uploadModalOverlay" role="dialog" aria-modal="true" aria-label="Upload bulk questions">
          <div className="uploadModalBackdrop" onClick={closeUploadBulkModal} aria-hidden="true" />
          <div className="uploadModalPanel" onClick={(e) => e.stopPropagation()}>
            <div className="uploadModalHeader">
              <h2>Upload Bulk Question</h2>
              <button type="button" className="uploadModalClose" onClick={closeUploadBulkModal} aria-label="Close">✕</button>
            </div>
            <div className="uploadModalBody">
              <p className="uploadModalHint">Upload an Excel (.xlsx, .xls) or CSV file with questions in column A.</p>
              <div className="uploadRfpToggleGroup uploadRfpToggleGroupInModal">
                <label className="uploadRfpToggleRow">
                  <span className="uploadRfpToggleLabel">Advance search</span>
                  <button
                    type="button"
                    className="uploadRfpInfoIcon"
                    onClick={(e) => { e.preventDefault(); setInfoAdvanceOpen((v) => !v); setInfoReasoningOpen(false); }}
                    aria-label="Information about Advance search"
                    title="Information"
                  >
                    <IconInfo />
                  </button>
                  {infoAdvanceOpen && (
                    <div className="uploadRfpInfoPopover" role="tooltip">
                      When enabled, search uses the Query Intelligence Layer: query cleanup, intent detection, rewriting, domain detection, filters, and optional clarification before retrieval to improve results.
                      <button type="button" className="uploadRfpInfoPopoverClose" onClick={(e) => { e.preventDefault(); setInfoAdvanceOpen(false); }} aria-label="Close">×</button>
                    </div>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={advanceSearchEnabled}
                    className={`uploadRfpToggleSwitch ${advanceSearchEnabled ? "uploadRfpToggleSwitchOn" : ""}`}
                    onClick={() => setAdvanceSearchEnabled((v) => !v)}
                  >
                    <span className="uploadRfpToggleKnob" />
                  </button>
                </label>
                <label className="uploadRfpToggleRow">
                  <span className="uploadRfpToggleLabel">Reasoning Response</span>
                  <button
                    type="button"
                    className="uploadRfpInfoIcon"
                    onClick={(e) => { e.preventDefault(); setInfoReasoningOpen((v) => !v); setInfoAdvanceOpen(false); }}
                    aria-label="Information about Reasoning Response"
                    title="Information"
                  >
                    <IconInfo />
                  </button>
                  {infoReasoningOpen && (
                    <div className="uploadRfpInfoPopover" role="tooltip">
                      When enabled, search uses the agentic reasoning API: query analysis, multi-query retrieval, reranking, and synthesis to produce a more comprehensive answer.
                      <button type="button" className="uploadRfpInfoPopoverClose" onClick={(e) => { e.preventDefault(); setInfoReasoningOpen(false); }} aria-label="Close">×</button>
                    </div>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reasoningResponseEnabled}
                    className={`uploadRfpToggleSwitch ${reasoningResponseEnabled ? "uploadRfpToggleSwitchOn" : ""}`}
                    onClick={() => setReasoningResponseEnabled((v) => !v)}
                  >
                    <span className="uploadRfpToggleKnob" />
                  </button>
                </label>
              </div>
              {(infoReasoningOpen || infoAdvanceOpen) && (
                <div className="uploadRfpInfoBackdrop uploadRfpInfoBackdropInModal" aria-hidden="true" onClick={() => { setInfoReasoningOpen(false); setInfoAdvanceOpen(false); }} />
              )}
              {uploadError && <div className="uploadModalError">{uploadError}</div>}
              <div
                className="uploadModalDropzone"
                onDrop={onBulkDrop}
                onDragOver={onBulkDragOver}
                onClick={() => bulkFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="uploadModalDropIcon">📄</div>
                <div className="uploadModalDropText">
                  {selectedFile ? selectedFile.name : "Drop your Excel or CSV file here or click to browse"}
                </div>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onBulkFileChange}
                  style={{ display: "none" }}
                />
              </div>
              <div className="uploadModalActions">
                <button type="button" className="ghostBtn" onClick={closeUploadBulkModal} disabled={uploading}>Cancel</button>
                <button type="button" className="primaryBtn primaryBtnPurple" onClick={handleBulkSave} disabled={uploading}>
                  {uploading ? "Uploading…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions table modal (after Save) */}
      {showQuestionsModal && (
        <div className="uploadModalOverlay questionsModalOverlay" role="dialog" aria-modal="true" aria-label="Bulk questions">
          <div className="uploadModalBackdrop" onClick={closeQuestionsModal} aria-hidden="true" />
          <div className="uploadModalPanel questionsModalPanel" onClick={(e) => e.stopPropagation()}>
            <div className="uploadModalHeader questionsModalHeader">
              <h2>Bulk Questions</h2>
              <div className="questionsModalHeaderRight">
                {bulkProjects.length > 0 && (
                  <label className="questionsModalProjectWrap" style={{ marginRight: 12 }}>
                    <span className="questionsModalProjectLabel" style={{ marginRight: 6, fontSize: 14 }}>Project</span>
                    <select
                      className="docSelect"
                      value={bulkProjectId ?? ""}
                      onChange={(e) => setBulkProjectId(e.target.value ? Number(e.target.value) : null)}
                      disabled={generatingAnswers}
                      aria-label="Project to search"
                    >
                      {bulkProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="uploadRfpToggleGroup">
                  <label className="uploadRfpToggleRow">
                    <span className="uploadRfpToggleLabel">Advance search</span>
                    <button
                      type="button"
                      className="uploadRfpInfoIcon"
                      onClick={(e) => { e.preventDefault(); setInfoAdvanceOpen((v) => !v); setInfoReasoningOpen(false); }}
                      aria-label="Information about Advance search"
                      title="Information"
                    >
                      <IconInfo />
                    </button>
                    {infoAdvanceOpen && (
                      <div className="uploadRfpInfoPopover" role="tooltip">
                        When enabled, search uses the Query Intelligence Layer: query cleanup, intent detection, rewriting, domain detection, filters, and optional clarification before retrieval to improve results.
                        <button type="button" className="uploadRfpInfoPopoverClose" onClick={(e) => { e.preventDefault(); setInfoAdvanceOpen(false); }} aria-label="Close">×</button>
                      </div>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={advanceSearchEnabled}
                      className={`uploadRfpToggleSwitch ${advanceSearchEnabled ? "uploadRfpToggleSwitchOn" : ""}`}
                      onClick={() => setAdvanceSearchEnabled((v) => !v)}
                    >
                      <span className="uploadRfpToggleKnob" />
                    </button>
                  </label>
                  <label className="uploadRfpToggleRow">
                    <span className="uploadRfpToggleLabel">Reasoning Response</span>
                    <button
                      type="button"
                      className="uploadRfpInfoIcon"
                      onClick={(e) => { e.preventDefault(); setInfoReasoningOpen((v) => !v); setInfoAdvanceOpen(false); }}
                      aria-label="Information about Reasoning Response"
                      title="Information"
                    >
                      <IconInfo />
                    </button>
                    {infoReasoningOpen && (
                      <div className="uploadRfpInfoPopover" role="tooltip">
                        When enabled, search uses the agentic reasoning API: query analysis, multi-query retrieval, reranking, and synthesis to produce a more comprehensive answer.
                        <button type="button" className="uploadRfpInfoPopoverClose" onClick={(e) => { e.preventDefault(); setInfoReasoningOpen(false); }} aria-label="Close">×</button>
                      </div>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reasoningResponseEnabled}
                      className={`uploadRfpToggleSwitch ${reasoningResponseEnabled ? "uploadRfpToggleSwitchOn" : ""}`}
                      onClick={() => setReasoningResponseEnabled((v) => !v)}
                    >
                      <span className="uploadRfpToggleKnob" />
                    </button>
                  </label>
                </div>
                {(infoReasoningOpen || infoAdvanceOpen) && (
                  <div className="uploadRfpInfoBackdrop" aria-hidden="true" onClick={() => { setInfoReasoningOpen(false); setInfoAdvanceOpen(false); }} />
                )}
                <button
                  type="button"
                  className="primaryBtn primaryBtnPurple"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers || bulkQuestions.length === 0}
                >
                  {generatingAnswers
                    ? `Generating ${generatingIndex}/${bulkQuestions.length}…`
                    : "Generate answer"}
                </button>
                <button type="button" className="uploadModalClose" onClick={closeQuestionsModal} aria-label="Close">✕</button>
              </div>
            </div>
            <div className="questionsModalBody bulkQuestionsModalBody">
              {generateError && <div className="uploadModalError" style={{ marginBottom: 12 }}>{generateError}</div>}
              <div className="questionsTableWrap">
                <table className="questionsTable">
                  <thead>
                    <tr>
                      <th className="questionsThQuestion">Question</th>
                      <th className="questionsThAnswer">Answer</th>
                      <th className="questionsThActions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuestions.map((row) => (
                      <tr key={row.id}>
                        <td className="questionsTdQuestion">{row.question}</td>
                        <td className="questionsTdAnswer">{formatBulkAnswerDisplay(row.answer) || "—"}</td>
                        <td className="questionsTdActions">
                          <button type="button" className="questionsKebab" aria-label="More actions">⋯</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="questionsPagination">
                <button
                  type="button"
                  className="ghostBtn questionsPageBtn"
                  disabled={questionsPage <= 1}
                  onClick={() => setQuestionsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="questionsPageInfo">
                  Page {questionsPage} of {totalPages} ({bulkQuestions.length} questions)
                </span>
                <button
                  type="button"
                  className="ghostBtn questionsPageBtn"
                  disabled={questionsPage >= totalPages}
                  onClick={() => setQuestionsPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
