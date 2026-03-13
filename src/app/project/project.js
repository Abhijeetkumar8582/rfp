"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, intelligenceHub as intelligenceHubApi, projects as projectsApi, dashboard as dashboardApi } from "../../lib/api";
import "../css/project.css";

const GAPS_PREVIEW_COUNT = 3;
const LOW_CONFIDENCE_PREVIEW_COUNT = 3;

export default function IntelligenceHub() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [data, setData] = useState(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewGapsOpen, setReviewGapsOpen] = useState(false);
  const [gapAnswers, setGapAnswers] = useState({});
  const [improveCoverageOpen, setImproveCoverageOpen] = useState(false);
  const [lowConfidenceNotes, setLowConfidenceNotes] = useState({});

  const gapsPreview = useMemo(() => knowledgeGaps.slice(0, GAPS_PREVIEW_COUNT), [knowledgeGaps]);

  const setAnswerForGap = (key, value) => {
    setGapAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const setNoteForLowConfidence = (key, value) => {
    setLowConfidenceNotes((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Intelligence Hub",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list || []);
      if (list?.length > 0 && selectedProjectId == null) {
        setSelectedProjectId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    intelligenceHubApi.get(selectedProjectId || undefined)
      .then((res) => setData(res || {}))
      .catch((err) => {
        setError(err.message || "Failed to load Intelligence Hub data");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Only fetch knowledge gaps when a project is selected (data from search_queries for that project only)
  useEffect(() => {
    if (!selectedProjectId) {
      setKnowledgeGaps([]);
      setGapsLoading(false);
      return;
    }
    setGapsLoading(true);
    dashboardApi.getKnowledgeGaps(selectedProjectId, 28)
      .then((res) => setKnowledgeGaps(res?.items ?? []))
      .catch(() => setKnowledgeGaps([]))
      .finally(() => setGapsLoading(false));
  }, [selectedProjectId]);

  const recentlyUploaded = data?.recently_uploaded ?? [];
  const mostSearched = data?.most_searched_topics ?? [];
  const lowConfidenceAreas = data?.low_confidence_areas ?? [];
  const highConfidenceAreas = data?.high_confidence_areas ?? [];
  const lowConfidencePreview = useMemo(() => lowConfidenceAreas.slice(0, LOW_CONFIDENCE_PREVIEW_COUNT), [lowConfidenceAreas]);

  return (
    <AppShell mainClassName="pmMain">
      {/* Header */}
      <div className="ihHeader">
        <div className="ihHeaderContent">
          <h1 className="ihTitle">Intelligence Hub</h1>
          <p className="ihSubtitle">
            AI-powered insights from your RFP knowledge base
          </p>
          {projects.length > 1 && (
            <div className="ihProjectSelect">
              <label htmlFor="ih-project">Project:</label>
              <select
                id="ih-project"
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="ihProjectSelectOpt"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="topSearch ihSearch">
          <span className="searchIcon">🔎</span>
          <input placeholder="Search across knowledge base..." />
        </div>
      </div>

      {error && (
        <div className="ihError">
          {error}
        </div>
      )}

      {loading ? (
        <div className="ihLoading">Loading Intelligence Hub data…</div>
      ) : (
      /* Sections grid */
      <div className="ihGrid">
        {/* Recently Uploaded Docs */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">📄</span>
            <h2 className="ihCardTitle">Recently Uploaded Docs</h2>
          </div>
          <ul className="ihDocList">
            {recentlyUploaded.length > 0 ? (
              recentlyUploaded.map((doc, i) => (
                <li key={doc.id ?? `${doc.name}-${i}`} className="ihDocItem">
                  <div className="ihDocInfo">
                    <span className="ihDocName">{doc.name}</span>
                    <span className="ihDocMeta">{doc.time} · {doc.size}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="ihDocItem ihEmpty">No documents uploaded yet</li>
            )}
          </ul>
          <a href="/filerepo" className="ihCardLink">View all →</a>
        </section>

        {/* Most Searched Topics */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">🔥</span>
            <h2 className="ihCardTitle">Most Searched Topics</h2>
          </div>
          <p className="ihCardDesc">
            Topics users search for most often
          </p>
          <ul className="ihTopicList">
            {mostSearched.length > 0 ? (
              mostSearched.map((t, i) => (
                <li key={`topic-${i}-${t.topic}`} className="ihTopicItem">
                  <span className="ihTopicName">{t.topic}</span>
                  <span className="ihTopicCount">{t.count} searches</span>
                </li>
              ))
            ) : (
              <li className="ihTopicItem ihEmpty">No searches yet. Try the search page.</li>
            )}
          </ul>
        </section>

        {/* Gaps in Knowledge — show first 3 only; "Review gaps" opens modal with all + answer inputs */}
        <section className="ihCard ihCardWarn">
          <div className="ihCardHeader">
            <span className="ihCardIcon">⚠️</span>
            <h2 className="ihCardTitle">Gaps in Knowledge</h2>
          </div>
          <p className="ihCardDesc">
            Questions that were not answered by the search query (no results, missing topic, or insufficient evidence)
          </p>
          {gapsLoading ? (
            <div className="ihGapsLoading">Loading…</div>
          ) : (
            <ul className="ihGapList">
              {knowledgeGaps.length === 0 ? (
                <li className="ihGapItem ihEmpty">No gaps identified</li>
              ) : (
                gapsPreview.map((item, i) => (
                  <li key={item.id ?? `gap-${i}`} className="ihGapItem">
                    <span className="ihGapQuestion">{item.query_text}</span>
                    <div className="ihGapMeta">
                      {item.no_answer_reason && (
                        <span className="ihGapBadge">{item.no_answer_reason.replace(/_/g, " ")}</span>
                      )}
                      {item.ts && (
                        <span className="ihGapDate">{new Date(item.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
          <div className="ihCardFooter ihCardFooterGaps">
            <button
              type="button"
              className="review-gaps"
              disabled={knowledgeGaps.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (knowledgeGaps.length > 0) setReviewGapsOpen(true);
              }}
              aria-label="Review gaps"
            >
              <div>
                <div className="pencil" />
                <div className="folder">
                  <div className="top">
                    <svg viewBox="0 0 24 27">
                      <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8.17157288 C24,8.70200585 23.7892863,9.21071368 23.4142136,9.58578644 L20.5857864,12.4142136 C20.2107137,12.7892863 20,13.2979941 20,13.8284271 L20,26 C20,26.5522847 19.5522847,27 19,27 L1,27 C0.44771525,27 6.76353751e-17,26.5522847 0,26 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                    </svg>
                  </div>
                  <div className="paper" />
                </div>
              </div>
              Review gaps
            </button>
          </div>
        </section>

        {/* Low Confidence Areas — show first 3 only; "Improve coverage" opens modal */}
        <section className="ihCard ihCardWarn">
          <div className="ihCardHeader">
            <span className="ihCardIcon">📊</span>
            <h2 className="ihCardTitle">Low Confidence Areas</h2>
          </div>
          <p className="ihCardDesc">
            Sections where AI retrieval confidence is below 75%
          </p>
          <ul className="ihConfList">
            {lowConfidenceAreas.length === 0 ? (
              <li className="ihConfItem ihEmpty">No low-confidence areas identified</li>
            ) : (
              lowConfidencePreview.map((c, i) => (
                <li key={`low-${i}-${c.section}`} className="ihConfItem">
                  <span className="ihConfSection">{c.section}</span>
                  <div className="ihConfBarWrap">
                    <div
                      className={`ihConfBar ${c.confidence < 65 ? "ihConfBarLow" : ""}`}
                      style={{ width: `${c.confidence}%` }}
                    />
                  </div>
                  <span className="ihConfPct">{c.confidence}%</span>
                </li>
              ))
            )}
          </ul>
          <div className="ihCardFooter ihCardFooterGaps">
            <button
              type="button"
              className="improve-coverage"
              disabled={lowConfidenceAreas.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (lowConfidenceAreas.length > 0) setImproveCoverageOpen(true);
              }}
              aria-label="Improve coverage"
            >
              <div>
                <div className="pencil" />
                <div className="folder">
                  <div className="top">
                    <svg viewBox="0 0 24 27">
                      <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8.17157288 C24,8.70200585 23.7892863,9.21071368 23.4142136,9.58578644 L20.5857864,12.4142136 C20.2107137,12.7892863 20,13.2979941 20,13.8284271 L20,26 C20,26.5522847 19.5522847,27 19,27 L1,27 C0.44771525,27 6.76353751e-17,26.5522847 0,26 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                    </svg>
                  </div>
                  <div className="paper" />
                </div>
              </div>
              Improve coverage
            </button>
          </div>
        </section>

        {/* High Confidence Areas */}
        <section className="ihCard ihCardSuccess">
          <div className="ihCardHeader">
            <span className="ihCardIcon">✓</span>
            <h2 className="ihCardTitle">High Confidence Areas</h2>
          </div>
          <p className="ihCardDesc">
            Topics where the system answers with high confidence (≥85%)
          </p>
          <ul className="ihConfList">
            {highConfidenceAreas.length > 0 ? (
              highConfidenceAreas.map((c, i) => (
                <li key={`high-${i}-${c.section}`} className="ihConfItem">
                  <span className="ihConfSection">{c.section}</span>
                  <div className="ihConfBarWrap">
                    <div
                      className="ihConfBar ihConfBarHigh"
                      style={{ width: `${c.confidence}%` }}
                    />
                  </div>
                  <span className="ihConfPct">{c.confidence}%</span>
                </li>
              ))
            ) : (
              <li className="ihConfItem ihEmpty">No high-confidence areas yet. Run more searches with good coverage.</li>
            )}
          </ul>
        </section>

        {/* Index Health */}
        <section className="ihCard ihCardFull">
          <div className="ihCardHeader">
            <span className="ihCardIcon">💚</span>
            <h2 className="ihCardTitle">Index Health</h2>
          </div>
          <div className="ihHealthGrid">
            <div className="ihHealthStat">
              <span className="ihHealthValue">94%</span>
              <span className="ihHealthLabel">Documents indexed</span>
            </div>
            <div className="ihHealthStat">
              <span className="ihHealthValue">12.4K</span>
              <span className="ihHealthLabel">Chunks in vector DB</span>
            </div>
            <div className="ihHealthStat">
              <span className="ihHealthValue">Good</span>
              <span className="ihHealthLabel">Embedding quality</span>
            </div>
          </div>
          <div className="ihHealthBarWrap">
            <div className="ihHealthBar" style={{ width: "94%" }} />
          </div>
          <p className="ihHealthStatus">Last indexed: 5 min ago</p>
        </section>
      </div>
      )}

      {/* Review Gaps modal — all insufficient questions + answer per question */}
      {reviewGapsOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="ihModalOverlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ih-modal-title"
            onClick={() => setReviewGapsOpen(false)}
          >
            <div className="ihModal" onClick={(e) => e.stopPropagation()}>
              <div className="ihModalHeader">
                <h2 id="ih-modal-title" className="ihModalTitle">Review gaps — insufficient answers</h2>
                <button
                  type="button"
                  className="ihModalClose"
                  onClick={() => setReviewGapsOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="ihModalBody">
                <p className="ihModalDesc">
                  Questions that had no results or low confidence. Add or edit answers below.
                </p>
                <div className="ihModalGapsTableWrap">
                  <table className="ihModalGapsTable">
                    <thead>
                      <tr>
                        <th className="ihModalGapsThQuestion">Question</th>
                        <th className="ihModalGapsThAnswer">Your answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {knowledgeGaps.map((item, i) => {
                        const key = item.id ?? `gap-${i}`;
                        return (
                          <tr key={key} className="ihModalGapsRow">
                            <td className="ihModalGapsTdQuestion">
                              <span className="ihModalGapQuestion">
                                {item.query_text}
                                {item.no_answer_reason && (
                                  <span className="ihModalGapReason">{item.no_answer_reason.replace(/_/g, " ")}</span>
                                )}
                              </span>
                            </td>
                            <td className="ihModalGapsTdAnswer">
                              <textarea
                                id={`ih-answer-${key}`}
                                className="ihModalGapTextarea"
                                placeholder="Write your answer here..."
                                value={gapAnswers[key] ?? ""}
                                onChange={(e) => setAnswerForGap(key, e.target.value)}
                                rows={2}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="ihModalFooter">
                <button type="button" className="ihCardBtn" onClick={() => setReviewGapsOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="ihModalSubmit"
                  onClick={() => {
                    /* TODO: submit answers to API */
                    setReviewGapsOpen(false);
                  }}
                >
                  Save answers
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Improve coverage modal — low confidence areas, Excel-style table */}
      {improveCoverageOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="ihModalOverlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ih-modal-improve-title"
            onClick={() => setImproveCoverageOpen(false)}
          >
            <div className="ihModal" onClick={(e) => e.stopPropagation()}>
              <div className="ihModalHeader">
                <h2 id="ih-modal-improve-title" className="ihModalTitle">Improve coverage — low confidence areas</h2>
                <button
                  type="button"
                  className="ihModalClose"
                  onClick={() => setImproveCoverageOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="ihModalBody">
                <p className="ihModalDesc">
                  Sections where AI confidence is below 75%. Add notes or improvement plans below.
                </p>
                <div className="ihModalGapsTableWrap">
                  <table className="ihModalGapsTable">
                    <thead>
                      <tr>
                        <th className="ihModalGapsThQuestion">Section</th>
                        <th className="ihModalGapsThAnswer">Your notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowConfidenceAreas.map((c, i) => {
                        const key = `low-${i}-${c.section}`;
                        return (
                          <tr key={key} className="ihModalGapsRow">
                            <td className="ihModalGapsTdQuestion">
                              <span className="ihModalGapQuestion">
                                {c.section}
                                <span className="ihModalConfPill">{c.confidence}%</span>
                              </span>
                            </td>
                            <td className="ihModalGapsTdAnswer">
                              <textarea
                                id={`ih-notes-${key}`}
                                className="ihModalGapTextarea"
                                placeholder="Add notes or improvement plan..."
                                value={lowConfidenceNotes[key] ?? ""}
                                onChange={(e) => setNoteForLowConfidence(key, e.target.value)}
                                rows={2}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="ihModalFooter">
                <button type="button" className="ihCardBtn" onClick={() => setImproveCoverageOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="ihModalSubmit"
                  onClick={() => {
                    /* TODO: submit notes to API */
                    setImproveCoverageOpen(false);
                  }}
                >
                  Save notes
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppShell>
  );
}
