"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import AppShell from "../components/AppShell";
import "../css/intelligence-hub.css";

/** Mock gaps: questions with insufficient or no answers (replace with API later) */
const MOCK_GAPS = [
  { id: "g1", question: "What is the warranty period for hardware?", reason: "No results", date: "2025-03-10" },
  { id: "g2", question: "How do we handle data retention for EU customers?", reason: "Low confidence", date: "2025-03-11" },
  { id: "g3", question: "What are the SLAs for premium support?", reason: "No results", date: "2025-03-12" },
  { id: "g4", question: "Is there an API rate limit for bulk exports?", reason: "Low confidence", date: "2025-03-12" },
  { id: "g5", question: "Which compliance certifications does the product have?", reason: "No results", date: "2025-03-13" },
];

const GAPS_PREVIEW_COUNT = 3;

/**
 * Intelligence Hub — skeleton layout.
 * Div structure:
 *   .ihPage
 *     .ihHeader
 *     .ihStatsStrip (optional)
 *     .ihMain > .ihGrid > .ihCard × N
 *   Gaps in Knowledge: show first 3 items; "Review gaps" opens modal with all questions + answer inputs.
 */
export default function IntelligenceHubSkeleton() {
  const [gaps] = useState(MOCK_GAPS);
  const [reviewGapsOpen, setReviewGapsOpen] = useState(false);
  const [gapAnswers, setGapAnswers] = useState({});

  const gapsPreview = useMemo(() => gaps.slice(0, GAPS_PREVIEW_COUNT), [gaps]);
  const displayGaps = gapsPreview.length > 0 ? gapsPreview : gaps.slice(0, GAPS_PREVIEW_COUNT);

  const setAnswerForGap = (gapId, value) => {
    setGapAnswers((prev) => ({ ...prev, [gapId]: value }));
  };

  return (
    <AppShell mainClassName="pmMain">
      <div className="ihPage">
        {/* Header */}
        <header className="ihHeader">
          <div className="ihHeaderRow">
            <div className="ihHeaderContent">
              <h1 className="ihTitle">Intelligence Hub</h1>
              <p className="ihSubtitle">
                AI-powered insights from your RFP knowledge base
              </p>
            </div>
            <div className="ihHeaderActions">
              <div className="ihProjectSelect">
                <label htmlFor="ih-project-skel">Project</label>
                <select id="ih-project-skel" className="ihProjectSelectOpt" disabled aria-hidden="true">
                  <option>Select project</option>
                </select>
              </div>
            </div>
          </div>
          <div className="ihSearchWrap">
            <div className="ihSearch" role="search">
              <span className="ihSearchIcon" aria-hidden>🔎</span>
              <input type="search" placeholder="Search across knowledge base..." disabled aria-label="Search" />
            </div>
          </div>
        </header>

        {/* Stats strip — placeholder metrics */}
        <div className="ihStatsStrip">
          <div className="ihStat">
            <span className="ihStatValue">—</span>
            <span className="ihStatLabel">Documents indexed</span>
          </div>
          <div className="ihStat">
            <span className="ihStatValue">—</span>
            <span className="ihStatLabel">Chunks in vector DB</span>
          </div>
          <div className="ihStat">
            <span className="ihStatValue">—</span>
            <span className="ihStatLabel">Active users</span>
          </div>
          <div className="ihStat">
            <span className="ihStatValue">—</span>
            <span className="ihStatLabel">Avg confidence</span>
          </div>
        </div>

        {/* Main grid — cards */}
        <main className="ihMain">
          <div className="ihGrid">
            {/* Card: Recent Search */}
            <section className="ihCard" aria-labelledby="ih-card-recent-search">
              <div className="ihCardHeader">
                <div className="ihCardIcon">🔍</div>
                <h2 id="ih-card-recent-search" className="ihCardTitle">Recent Search</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Your latest search queries.</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">No recent searches</li>
                </ul>
              </div>
              <div className="ihCardFooter">
                <a href="#" className="ihCardLink">View all →</a>
              </div>
            </section>

            {/* Card: Most Topic */}
            <section className="ihCard" aria-labelledby="ih-card-most-topic">
              <div className="ihCardHeader">
                <div className="ihCardIcon">🔥</div>
                <h2 id="ih-card-most-topic" className="ihCardTitle">Most Topic</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Topics searched most often.</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">No topic data yet</li>
                </ul>
              </div>
              <div className="ihCardFooter">
                <a href="#" className="ihCardLink">View all →</a>
              </div>
            </section>

            {/* Card: All — full width */}
            <section className="ihCard ihCardFull" aria-labelledby="ih-card-all">
              <div className="ihCardHeader">
                <div className="ihCardIcon">📋</div>
                <h2 id="ih-card-all" className="ihCardTitle">All</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Combined view: recent searches, top topics, and activity.</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">No activity yet</li>
                </ul>
              </div>
              <div className="ihCardFooter">
                <a href="#" className="ihCardLink">View all →</a>
              </div>
            </section>

            {/* Card: Recently Uploaded */}
            <section className="ihCard" aria-labelledby="ih-card-recent">
              <div className="ihCardHeader">
                <div className="ihCardIcon">📄</div>
                <h2 id="ih-card-recent" className="ihCardTitle">Recently Uploaded Docs</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Placeholder for recent uploads list.</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">No documents yet</li>
                </ul>
              </div>
              <div className="ihCardFooter">
                <a href="/filerepo" className="ihCardLink">View all →</a>
              </div>
            </section>

            {/* Card: Gaps in Knowledge — show first 3 only; "Review gaps" opens modal */}
            <section className="ihCard ihCardWarn" aria-labelledby="ih-card-gaps">
              <div className="ihCardHeader">
                <div className="ihCardIcon">⚠️</div>
                <h2 id="ih-card-gaps" className="ihCardTitle">Gaps in Knowledge</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">
                  Questions not answered by search (no results or low confidence).
                </p>
                <ul className="ihList">
                  {gaps.length === 0 ? (
                    <li className="ihListItem ihListEmpty">No gaps identified</li>
                  ) : (
                    displayGaps.slice(0, GAPS_PREVIEW_COUNT).map((g) => (
                      <li key={g.id} className="ihListItem">
                        <span className="ihGapsQuestion">{g.question}</span>
                        {g.reason && <span className="ihGapsReason">{g.reason}</span>}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div
                className="ihCardFooter ihCardFooterGaps"
                role="button"
                tabIndex={gaps.length === 0 ? -1 : 0}
                aria-label="Review gaps"
                onClick={() => gaps.length > 0 && setReviewGapsOpen(true)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && gaps.length > 0) {
                    e.preventDefault();
                    setReviewGapsOpen(true);
                  }
                }}
              >
                <button
                  type="button"
                  className="ihCardBtn ihCardBtnReviewGaps"
                  disabled={gaps.length === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setReviewGapsOpen(true);
                  }}
                >
                  Review gaps
                </button>
              </div>
            </section>

            {/* Card: Low Confidence Areas */}
            <section className="ihCard ihCardWarn" aria-labelledby="ih-card-low">
              <div className="ihCardHeader">
                <div className="ihCardIcon">📊</div>
                <h2 id="ih-card-low" className="ihCardTitle">Low Confidence Areas</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Sections where AI confidence is below 75%.</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">No low-confidence areas yet</li>
                </ul>
              </div>
              <div className="ihCardFooter">
                <button type="button" className="ihCardBtn" disabled>Improve coverage</button>
              </div>
            </section>

            {/* Card: High Confidence Areas — full width */}
            <section className="ihCard ihCardSuccess ihCardFull" aria-labelledby="ih-card-high">
              <div className="ihCardHeader">
                <div className="ihCardIcon">✓</div>
                <h2 id="ih-card-high" className="ihCardTitle">High Confidence Areas</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Topics where the system answers with high confidence (≥85%).</p>
                <ul className="ihList">
                  <li className="ihListItem ihListEmpty">Run more searches to see high-confidence topics</li>
                </ul>
              </div>
            </section>

            {/* Card: Index Health — full width */}
            <section className="ihCard ihCardFull" aria-labelledby="ih-card-health">
              <div className="ihCardHeader">
                <div className="ihCardIcon">💚</div>
                <h2 id="ih-card-health" className="ihCardTitle">Index Health</h2>
              </div>
              <div className="ihCardBody">
                <p className="ihCardDesc">Vector store and embedding status.</p>
                <div className="ihStatsStrip">
                  <div className="ihStat">
                    <span className="ihStatValue">—</span>
                    <span className="ihStatLabel">Documents indexed</span>
                  </div>
                  <div className="ihStat">
                    <span className="ihStatValue">—</span>
                    <span className="ihStatLabel">Chunks in vector DB</span>
                  </div>
                  <div className="ihStat">
                    <span className="ihStatValue">—</span>
                    <span className="ihStatLabel">Embedding quality</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Review Gaps modal — render in portal so it's on top; all insufficient questions + answer per question */}
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
                  <ul className="ihModalGapsList">
                    {gaps.map((g) => (
                      <li key={g.id} className="ihModalGapItem">
                        <div className="ihModalGapQuestion">
                          <strong>Q:</strong> {g.question}
                          {g.reason && <span className="ihModalGapReason">{g.reason}</span>}
                        </div>
                        <label className="ihModalGapLabel" htmlFor={`ih-answer-${g.id}`}>
                          Your answer
                        </label>
                        <textarea
                          id={`ih-answer-${g.id}`}
                          className="ihModalGapTextarea"
                          placeholder="Write your answer here..."
                          value={gapAnswers[g.id] ?? ""}
                          onChange={(e) => setAnswerForGap(g.id, e.target.value)}
                          rows={3}
                        />
                      </li>
                    ))}
                  </ul>
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
      </div>
    </AppShell>
  );
}
