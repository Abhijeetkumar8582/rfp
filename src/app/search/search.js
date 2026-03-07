"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, search as searchApi, projects as projectsApi } from "../../lib/api";
import "../css/SearchSection.css";

function IconUser() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20v-2a5 5 0 0 1 10 0v2" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15 9 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 9" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconRegenerate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconThumbsUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconThumbsDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const MIN_SEGMENT = 5;

function clampPcts(textPct, vectorPct, rerankPct) {
  let t = Math.max(MIN_SEGMENT, Math.round(textPct));
  let v = Math.max(MIN_SEGMENT, Math.round(vectorPct));
  let r = Math.max(MIN_SEGMENT, Math.round(rerankPct));
  const sum = t + v + r;
  if (sum !== 100) {
    const diff = 100 - sum;
    if (diff > 0) r += diff;
    else if (diff < 0) {
      if (r + diff >= MIN_SEGMENT) r += diff;
      else if (v + diff >= MIN_SEGMENT) v += diff;
      else t += diff;
    }
  }
  return { textPct: t, vectorPct: v, rerankPct: r };
}

export default function SearchSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [language, setLanguage] = useState("en");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [reasoningAnswerEnabled, setReasoningAnswerEnabled] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [reasoningLog, setReasoningLog] = useState([]);
  const [userFeedback, setUserFeedback] = useState(null);
  const [feedbackPopupOpen, setFeedbackPopupOpen] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(null); /* 0-9 for "How likely..." */
  const [balance, setBalance] = useState({ textPct: 30, vectorPct: 60, rerankPct: 10 });
  const balanceRef = React.useRef(null);
  const draggingHandleRef = React.useRef(null);
  const { textPct, vectorPct, rerankPct } = balance;

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list || []);
      if (list?.length > 0 && selectedProjectId == null) {
        setSelectedProjectId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const updateBalanceFromX = React.useCallback((clientX, handleIndex) => {
    const el = balanceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const pct = Math.round(x * 100);
    setBalance((prev) => {
      let t = prev.textPct, v = prev.vectorPct, r = prev.rerankPct;
      if (handleIndex === 1) {
        t = Math.max(MIN_SEGMENT, Math.min(100 - 2 * MIN_SEGMENT, pct));
        r = Math.max(MIN_SEGMENT, 100 - t - v);
        v = 100 - t - r;
      } else {
        const vectorEnd = Math.max(prev.textPct + MIN_SEGMENT, Math.min(100 - MIN_SEGMENT, pct));
        v = vectorEnd - prev.textPct;
        r = 100 - vectorEnd;
      }
      return clampPcts(t, v, r);
    });
  }, []);

  const handleBalanceMouseDown = React.useCallback((e, handleIndex) => {
    e.preventDefault();
    draggingHandleRef.current = handleIndex;
    const onMove = (ev) => {
      if (draggingHandleRef.current === handleIndex) {
        updateBalanceFromX(ev.clientX, handleIndex);
      }
    };
    const onUp = () => {
      draggingHandleRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [updateBalanceFromX]);

  const displayPcts = clampPcts(textPct, vectorPct, rerankPct);

  const languages = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "hi", label: "हिन्दी" },
  ];
  const currentLanguageLabel = languages.find((l) => l.code === language)?.label ?? "English";

  async function handleSubmit(e) {
    e?.preventDefault();
    const q = (query || "").trim();
    if (!q) return;
    if (selectedProjectId == null) {
      setSearchError("Select a project to search. Open Settings (gear icon) to choose a project.");
      return;
    }
    setSubmittedQuery(q);
    setHasSearched(true);
    setSearchError(null);
    setSearchResults(null);
    setUserFeedback(null);
    setFeedbackPopupOpen(false);
    setFeedbackComment("");
    setFeedbackRating(null);
    setReasoningLog([]);
    setSearchLoading(true);
    try {
      let res;
      if (reasoningAnswerEnabled) {
        res = await searchApi.reasoningStream(q, selectedProjectId, { k: 20, top_k: 12 }, {
          onEvent: ({ type, data }) => {
            if (type === "status" && data?.message) {
              setReasoningLog((prev) => [...prev, { kind: "status", text: data.message }]);
            } else if (type === "query_analysis") {
              const parts = [];
              if (data?.intent) parts.push(`Intent: ${data.intent}`);
              if (data?.domain) parts.push(`Domain: ${data.domain}`);
              if (data?.answer_type) parts.push(`Answer type: ${data.answer_type}`);
              if (parts.length) setReasoningLog((prev) => [...prev, { kind: "analysis", text: parts.join(", ") }]);
            } else if (type === "search_query" && data?.query) {
              const suffix = data.total > 1 ? ` (${data.index}/${data.total})` : "";
              setReasoningLog((prev) => [...prev, { kind: "query", text: `Generated question: ${data.query}${suffix}` }]);
            } else if (type === "confidence" && data) {
              const pct = typeof data.overall === "number" ? Math.round(data.overall * 100) : data.overall;
              setReasoningLog((prev) => [...prev, { kind: "confidence", text: `Confidence: ${pct}%` }]);
            }
          },
        });
        setReasoningLog([]);
      } else {
        res = await searchApi.answer(q, selectedProjectId, 10);
      }
      setSearchResults(res);
      activityApi.create({
        actor: user?.name || user?.email || "User",
        event_action: "Search query",
        target_resource: q.length > 200 ? q.slice(0, 200) + "…" : q,
        severity: "info",
        system: "web",
      }).catch(() => {});
    } catch (err) {
      setSearchError(err.message || "Search failed.");
      setSearchResults(null);
      setReasoningLog([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleThumbsUp() {
    const id = searchResults?.search_query_id;
    if (!id) return;
    try {
      await searchApi.submitFeedback(id, { feedback_status: "positive", feedback_score: 1 });
      setUserFeedback("positive");
    } catch (e) {
      console.warn("Feedback failed:", e);
    }
  }

  function handleThumbsDown() {
    setFeedbackPopupOpen(true);
  }

  function closeFeedbackPopup() {
    setFeedbackPopupOpen(false);
    setFeedbackComment("");
    setFeedbackRating(null);
  }

  async function handleFeedbackSubmit() {
    const id = searchResults?.search_query_id;
    if (!id) return;
    try {
      await searchApi.submitFeedback(id, {
        feedback_status: "negative",
        feedback_score: feedbackRating != null ? feedbackRating : -1,
        feedback_text: feedbackComment.trim() || undefined,
      });
      setUserFeedback("negative");
      closeFeedbackPopup();
    } catch (e) {
      console.warn("Feedback failed:", e);
    }
  }

  function handleCopyResults() {
    const parts = [];
    if (searchResults?.answer) {
      parts.push("Answer:\n" + searchResults.answer);
    }
    if (searchResults?.results?.length) {
      parts.push(
        "Sources:\n" +
        searchResults.results
          .map((r, i) => `[${i + 1}] ${r.filename} (score: ${r.score})\n${r.content}`)
          .join("\n\n---\n\n")
      );
    }
    if (parts.length) navigator.clipboard?.writeText(parts.join("\n\n"));
  }

  return (
    <div className="searchPageBard">
      {/* Top header: bot name + language selector */}
      <header className="searchPageTopHeader">
        <h1 className="searchPageBotName">RFP Assistant</h1>
        <div className="searchPageHeaderRight">
          <label className="searchPageReasoningToggle">
            <span className="searchPageReasoningLabel">Reasoning Answer</span>
            <button
              type="button"
              role="switch"
              aria-checked={reasoningAnswerEnabled}
              className={`searchPageReasoningSwitch ${reasoningAnswerEnabled ? "searchPageReasoningSwitchOn" : ""}`}
              onClick={() => setReasoningAnswerEnabled((v) => !v)}
            >
              <span className="searchPageReasoningKnob" />
            </button>
          </label>
          <div className="searchPageLangWrap">
            <button
              type="button"
              className="searchPageLangTrigger"
              onClick={() => setLanguageDropdownOpen((o) => !o)}
              aria-expanded={languageDropdownOpen}
              aria-haspopup="listbox"
              aria-label="Select language"
            >
              <span className="searchPageLangLabel">{currentLanguageLabel}</span>
              <svg className="searchPageLangChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {languageDropdownOpen && (
              <>
                <div className="searchPageLangBackdrop" onClick={() => setLanguageDropdownOpen(false)} aria-hidden="true" />
                <ul className="searchPageLangDropdown" role="listbox">
                  {languages.map(({ code, label }) => (
                    <li key={code} role="option" aria-selected={language === code}>
                      <button
                        type="button"
                        className={`searchPageLangOption ${language === code ? "searchPageLangOptionActive" : ""}`}
                        onClick={() => {
                          setLanguage(code);
                          setLanguageDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="searchPageSettingsWrap">
            <button
              type="button"
              className="searchPageSettingsTrigger searchPageSettingsIconOnly"
              onClick={() => setSearchSettingsOpen((o) => !o)}
              aria-expanded={searchSettingsOpen}
              aria-label="Search settings"
            >
              <IconSettings />
            </button>
            {searchSettingsOpen && (
              <>
                <div className="searchSettingsBackdrop" onClick={() => setSearchSettingsOpen(false)} aria-hidden="true" />
                <div className="searchSettingsPanel" role="dialog" aria-label="Search settings">
                  {projects.length > 0 && (
                    <div className="searchSettingsProjectRow">
                      <label className="searchSettingsProjectLabel">Project to search</label>
                      <select
                        className="searchSettingsProjectSelect"
                        value={selectedProjectId ?? ""}
                        onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                        aria-label="Project to search"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="searchSettingsPanelTitle">Search balance</div>
                  <p className="searchSettingsPanelHint">Drag the handles left or right to set weights (total 100%).</p>
                  <div className="searchSettingsBalanceWrap">
                    <div
                      className="searchSettingsBalanceBar"
                      ref={balanceRef}
                    >
                      <div className="searchSettingsBalanceSegment searchSettingsBalanceText" style={{ flex: `0 0 ${displayPcts.textPct}%` }} />
                      <div className="searchSettingsBalanceSegment searchSettingsBalanceVector" style={{ flex: `0 0 ${displayPcts.vectorPct}%` }} />
                      <div className="searchSettingsBalanceSegment searchSettingsBalanceRerank" style={{ flex: `0 0 ${displayPcts.rerankPct}%` }} />
                      <div
                        className="searchSettingsBalanceHandle"
                        style={{ left: `${displayPcts.textPct}%` }}
                        onMouseDown={(e) => handleBalanceMouseDown(e, 1)}
                        role="slider"
                        aria-valuenow={displayPcts.textPct}
                        aria-valuemin={MIN_SEGMENT}
                        aria-valuemax={100 - 2 * MIN_SEGMENT}
                        aria-label="Text search boundary"
                      />
                      <div
                        className="searchSettingsBalanceHandle"
                        style={{ left: `${displayPcts.textPct + displayPcts.vectorPct}%` }}
                        onMouseDown={(e) => handleBalanceMouseDown(e, 2)}
                        role="slider"
                        aria-valuenow={displayPcts.textPct + displayPcts.vectorPct}
                        aria-valuemin={displayPcts.textPct + MIN_SEGMENT}
                        aria-valuemax={100 - MIN_SEGMENT}
                        aria-label="Vector search boundary"
                      />
                    </div>
                    <div className="searchSettingsBalanceLabels">
                      <span className="searchSettingsBalanceLabelItem" style={{ width: `${displayPcts.textPct}%` }}>
                        Text {displayPcts.textPct}%
                      </span>
                      <span className="searchSettingsBalanceLabelItem searchSettingsBalanceLabelVector" style={{ width: `${displayPcts.vectorPct}%` }}>
                        Vector {displayPcts.vectorPct}%
                      </span>
                      <span className="searchSettingsBalanceLabelItem searchSettingsBalanceLabelRerank" style={{ width: `${displayPcts.rerankPct}%` }}>
                        Rerank {displayPcts.rerankPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="searchPageBardContent">
        {/* Header: user query (shown after search) */}
        {hasSearched && submittedQuery && (
          <header className="searchBardHeader">
            <div className="searchBardHeaderAvatar">
              <IconUser />
            </div>
            <p className="searchBardHeaderQuery">{submittedQuery}</p>
            <button type="button" className="searchBardHeaderEdit" aria-label="Edit query">
              <IconEdit />
            </button>
          </header>
        )}

        {/* Main: search results from ChromaDB (question embedding vs document embeddings) */}
        {hasSearched && (
          <section className="searchBardResponse">
            <div className="searchBardResponseInner">
              <div className="searchBardResponseAvatar">
                <IconStar />
              </div>
              <div className="searchBardResponseBody">
                {searchLoading && !reasoningAnswerEnabled && (
                  <p className="searchBardIntro">
                    Searching your documents and generating an answer with GPT…
                  </p>
                )}
                {reasoningLog.length > 0 && (
                  <div className="searchReasoningLog" role="log" aria-live="polite">
                    <div className="searchReasoningLogTitle">Reasoning</div>
                    <div className="searchReasoningLogLines">
                      {reasoningLog.map((entry, i) => (
                        <div key={i} className={`searchReasoningLogLine searchReasoningLogLine_${entry.kind}`}>
                          {entry.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchLoading && reasoningAnswerEnabled && reasoningLog.length === 0 && (
                  <p className="searchBardIntro">
                    Running agentic reasoning (query analysis, multi-search, reranking, synthesis)…
                  </p>
                )}
                {searchError && (
                  <p className="searchBardSearchError" role="alert">{searchError}</p>
                )}
                {!searchLoading && searchResults && (
                  <>
                    {searchResults.answer != null && searchResults.answer !== "" && (
                      <div className="searchBardAnswerWrap">
                        <p className="searchBardAnswer">{searchResults.answer}</p>
                        {searchResults.uncertainty_note && (
                          <p className="searchBardUncertainty">Note: {searchResults.uncertainty_note}</p>
                        )}
                        {searchResults.missing_info_note && (
                          <p className="searchBardMissingInfo">Missing info: {searchResults.missing_info_note}</p>
                        )}
                        {searchResults.clarification_suggested && (
                          <p className="searchBardClarification">Consider rephrasing or clarifying your question.</p>
                        )}
                        <div className="searchBardAnswerActions">
                          {searchResults.search_query_id != null && (
                            <div className="searchBardFeedbackBtns">
                              <button
                                type="button"
                                className={`searchBardFeedbackBtn ${userFeedback === "positive" ? "searchBardFeedbackBtnActive" : ""}`}
                                onClick={handleThumbsUp}
                                title="Helpful"
                                aria-label="Helpful"
                              >
                                <IconThumbsUp />
                              </button>
                              <button
                                type="button"
                                className={`searchBardFeedbackBtn ${userFeedback === "negative" ? "searchBardFeedbackBtnActive" : ""}`}
                                onClick={handleThumbsDown}
                                title="Not helpful"
                                aria-label="Not helpful"
                              >
                                <IconThumbsDown />
                              </button>
                            </div>
                          )}
                          <button type="button" className="searchBardActionBtn searchBardCopyAll" onClick={handleCopyResults} title="Copy answer and sources">
                            <IconCopy /> Copy all
                          </button>
                        </div>
                        {feedbackPopupOpen && (
                          <>
                            <div className="searchBardFeedbackBackdrop" onClick={closeFeedbackPopup} aria-hidden="true" />
                            <div className="searchBardFeedbackPopup" role="dialog" aria-label="Feedback">
                              <button type="button" className="searchBardFeedbackPopupClose" onClick={closeFeedbackPopup} aria-label="Close">
                                <IconClose />
                              </button>
                              <h3 className="searchBardFeedbackPopupTitle">How likely are you to answer to this question?</h3>
                              <div className="searchBardFeedbackScale">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    className={`searchBardFeedbackScaleBtn ${feedbackRating === n ? "searchBardFeedbackScaleBtnSelected" : ""}`}
                                    onClick={() => setFeedbackRating(n)}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                              <div className="searchBardFeedbackScaleLabels">
                                <span>Not likely at all</span>
                                <span>Extremely likely</span>
                              </div>
                              <h4 className="searchBardFeedbackImproveTitle">Tell us how we can improve</h4>
                              <textarea
                                className="searchBardFeedbackTextarea"
                                placeholder="Write your message here"
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                rows={3}
                              />
                              <div className="searchBardFeedbackPopupActions">
                                <button type="button" className="searchBardFeedbackPopupCancel" onClick={closeFeedbackPopup}>
                                  Skip
                                </button>
                                <button type="button" className="searchBardFeedbackPopupSubmit" onClick={handleFeedbackSubmit}>
                                  Submit
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="searchBardIntro">
                      <span>Sources ({searchResults.results?.length ?? 0} chunks from your knowledge base)</span>
                    </div>
                    <div className="searchBardResultsList">
                      {searchResults.results?.length === 0 ? (
                        <p className="searchBardNoResults">No matching chunks. Try a different question or train the datasource for this project.</p>
                      ) : (
                        searchResults.results?.map((r, i) => (
                          <div key={i} className="searchBardResultItem">
                            <div className="searchBardResultMeta">
                              <span className="searchBardResultFile">{r.filename || "Document"}</span>
                              <span className="searchBardResultScore">score: {r.score.toFixed(2)}</span>
                            </div>
                            <p className="searchBardResultContent">{r.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Empty state: show when no search yet */}
        {!hasSearched && (
          <div className="searchBardEmpty">
            <div className="searchBardEmptyAvatar">
              <IconStar />
            </div>
            <p className="searchBardEmptyText">Ask a question to search across your documents. Your question is embedded, matched against chunk embeddings, and answered by GPT using the top matches.</p>
          </div>
        )}
      </div>

      {/* Footer: input bar (always visible) */}
      <footer className="searchBardFooter">
        <form className="searchBardForm" onSubmit={handleSubmit}>
          <button type="button" className="searchBardFooterAdd" aria-label="Add attachment">
            <IconPlus />
          </button>
          <input
            type="text"
            className="searchBardInput"
            placeholder="Message Bard..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Message input"
          />
          <button type="button" className="searchBardFooterMic" aria-label="Voice input">
            <IconMic />
          </button>
          <button type="submit" className="searchBardFooterSend" aria-label="Send">
            <IconSend />
          </button>
        </form>
      </footer>
    </div>
  );
}
