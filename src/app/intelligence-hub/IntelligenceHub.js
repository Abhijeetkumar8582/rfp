"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, intelligenceHub as intelligenceHubApi, projects as projectsApi, dashboard as dashboardApi } from "../../lib/api";
import "../css/project.css";

const GAPS_PREVIEW_COUNT = 3;
const LOW_CONFIDENCE_PREVIEW_COUNT = 3;

function formatChunkCount(n) {
  if (n == null || !Number.isFinite(n)) return "0";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export default function IntelligenceHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [reviewGapsOpen, setReviewGapsOpen] = useState(false);
  const [gapAnswers, setGapAnswers] = useState({});
  const [improveCoverageOpen, setImproveCoverageOpen] = useState(false);
  const [lowConfidenceNotes, setLowConfidenceNotes] = useState({});
  const [saveGapsLoading, setSaveGapsLoading] = useState(false);
  const [saveGapsError, setSaveGapsError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [validateLoading, setValidateLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["filerepo", "projects"],
    queryFn: () => projectsApi.list(),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId == null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const {
    data: data = null,
    isLoading: loading,
    isError: hubError,
    error: hubErr,
  } = useQuery({
    queryKey: ["intelligence-hub", selectedProjectId],
    queryFn: () => intelligenceHubApi.get(selectedProjectId || undefined),
    enabled: selectedProjectId != null,
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: knowledgeGapsData,
    isLoading: gapsLoading,
  } = useQuery({
    queryKey: ["knowledge-gaps", selectedProjectId],
    queryFn: () => dashboardApi.getKnowledgeGaps(selectedProjectId, 28),
    enabled: selectedProjectId != null,
    staleTime: 2 * 60 * 1000,
  });

  const knowledgeGaps = knowledgeGapsData?.items ?? [];
  const error = hubError ? (hubErr?.message || "Failed to load Intelligence Hub data") : null;

  const canManageReviewGaps = (() => {
    const role = (user?.role || "").toLowerCase();
    return role === "admin" || role === "manager";
  })();

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
          <a href="/file-repository" className="ihCardLink">View all →</a>
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
                      {item.datetime && (
                        <span className="ihGapDate">{new Date(item.datetime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
          {canManageReviewGaps && (
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
          )}
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
          {canManageReviewGaps && (
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
          )}
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
          {data?.index_health ? (
            <>
              <div className="ihHealthGrid">
                <div className="ihHealthStat">
                  <span className="ihHealthValue">{data.index_health.documents_indexed_pct}%</span>
                  <span className="ihHealthLabel">Documents indexed</span>
                </div>
                <div className="ihHealthStat">
                  <span className="ihHealthValue">{formatChunkCount(data.index_health.chunks_in_vector_db)}</span>
                  <span className="ihHealthLabel">Chunks in vector DB</span>
                </div>
                <div className="ihHealthStat">
                  <span className="ihHealthValue">{data.index_health.embedding_quality}</span>
                  <span className="ihHealthLabel">Embedding quality</span>
                </div>
              </div>
              <div className="ihHealthBarWrap">
                <div className="ihHealthBar" style={{ width: `${Math.min(100, data.index_health.documents_indexed_pct)}%` }} />
              </div>
              <p className="ihHealthStatus">
                {data.index_health.last_indexed_ago ? `Last indexed: ${data.index_health.last_indexed_ago}` : "Last indexed: —"}
              </p>
            </>
          ) : (
            <p className="ihHealthStatus">No index health data for this project.</p>
          )}
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
            onClick={() => { setValidationResults(null); setReviewGapsOpen(false); }}
          >
            <div className="ihModal" onClick={(e) => e.stopPropagation()}>
              <div className="ihModalHeader">
                <h2 id="ih-modal-title" className="ihModalTitle">Review gaps — insufficient answers</h2>
                <button
                  type="button"
                  className="ihModalClose"
                  onClick={() => { setValidationResults(null); setReviewGapsOpen(false); }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="ihModalBody">
                <p className="ihModalDesc">
                  Questions that had no results or low confidence. Add or edit answers below.
                </p>
                {validationResults && validationResults.length > 0 && (
                  <div className="ihModalValidationSummary">
                    <span className="ihModalValidationTotal">Total validated: {validationResults.length}</span>
                    <span className="ihModalValidationGood">
                      Good confidence (≥60%): {validationResults.filter((r) => r.confidence >= 60).length}
                    </span>
                    <span className="ihModalValidationLow">
                      Low confidence (&lt;60%): {validationResults.filter((r) => r.confidence < 60).length}
                    </span>
                  </div>
                )}
                <div className="ihModalGapsTableWrap">
                  <table className="ihModalGapsTable">
                    <thead>
                      <tr>
                        <th className="ihModalGapsThQuestion">Question</th>
                        <th className="ihModalGapsThAnswer">Your answer</th>
                        {validationResults && validationResults.length > 0 && (
                          <th className="ihModalGapsThConfidence">Confidence</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {knowledgeGaps.map((item, i) => {
                        const key = String(item.id ?? `gap-${i}`);
                        const confidence = validationResults?.find((r) => r.search_query_id === item.id)?.confidence;
                        const isLowConfidence = confidence != null && confidence < 60;
                        return (
                          <tr
                            key={key}
                            className={`ihModalGapsRow ${isLowConfidence ? "ihModalGapsRowLowConfidence" : ""}`}
                          >
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
                                readOnly={!!validationResults}
                              />
                            </td>
                            {validationResults && validationResults.length > 0 && (
                              <td className="ihModalGapsTdConfidence">
                                {confidence != null ? (
                                  <span className={`ihModalConfidencePill ${isLowConfidence ? "ihModalConfidencePillLow" : ""}`}>
                                    {confidence}%
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="ihModalFooter">
                {saveGapsError && <p className="ihModalError" role="alert">{saveGapsError}</p>}
                {!validationResults ? (
                  <>
                    <button type="button" className="ihCardBtn" onClick={() => setReviewGapsOpen(false)}>
                      Close
                    </button>
                    <button
                      type="button"
                      className="ihModalSubmit"
                      disabled={validateLoading}
                      onClick={async () => {
                        setSaveGapsError(null);
                        const items = knowledgeGaps
                          .map((item) => ({
                            search_query_id: item.id,
                            question: item.query_text || "",
                            answer: (gapAnswers[String(item.id)] ?? "").trim(),
                          }))
                          .filter((x) => x.answer.length > 0);
                        if (items.length === 0) {
                          setSaveGapsError("Add at least one answer to validate.");
                          return;
                        }
                        setValidateLoading(true);
                        try {
                          const res = await dashboardApi.validateFaqAnswers({ items });
                          setValidationResults(res?.results ?? []);
                        } catch (err) {
                          setSaveGapsError(err?.message || "Validation failed.");
                        } finally {
                          setValidateLoading(false);
                        }
                      }}
                    >
                      {validateLoading ? "Validating…" : "Validate answer"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="ihCardBtn"
                      onClick={() => {
                        setValidationResults(null);
                        setReviewGapsOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ihModalSubmit"
                      disabled={saveGapsLoading}
                      onClick={async () => {
                        setSaveGapsError(null);
                        const goodItems = validationResults
                          .filter((r) => r.confidence >= 60)
                          .map((r) => ({
                            search_query_id: r.search_query_id,
                            answer: (gapAnswers[String(r.search_query_id)] ?? "").trim(),
                          }))
                          .filter((x) => x.answer.length > 0);
                        if (goodItems.length === 0) {
                          setSaveGapsError("No answers with confidence ≥60% to save.");
                          return;
                        }
                        setSaveGapsLoading(true);
                        try {
                          await dashboardApi.saveFaqAnswers({ items: goodItems });
                          setGapAnswers({});
                          setValidationResults(null);
                          setReviewGapsOpen(false);
                          queryClient.invalidateQueries({ queryKey: ["knowledge-gaps", selectedProjectId] });
                          queryClient.invalidateQueries({ queryKey: ["intelligence-hub", selectedProjectId] });
                        } catch (err) {
                          setSaveGapsError(err?.message || "Failed to save answers.");
                        } finally {
                          setSaveGapsLoading(false);
                        }
                      }}
                    >
                      {saveGapsLoading ? "Saving…" : "Save validated answer"}
                    </button>
                  </>
                )}
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
