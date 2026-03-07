"use client";
import React, { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, dashboard as dashboardApi } from "../../lib/api";
import "../css/dashboard.css";

const RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 28 days", days: 28 },
  { label: "This month", days: 30 },
];

const METRIC_CARDS = [
  { key: "overall_answer_accuracy", title: "Overall answer accuracy", format: "percent", subtitle: "From feedback / answer status" },
  { key: "total_questions_answered", title: "Total questions answered", format: "integer", subtitle: "Answered in window" },
  { key: "total_unanswered_questions", title: "Total unanswered questions", format: "integer", subtitle: "Unanswered or low confidence" },
  { key: "total_active_users", title: "Total active users", format: "integer", subtitle: "Distinct users who asked questions" },
  { key: "average_confidence_score", title: "Average confidence score", format: "percent", subtitle: "0–100% from AI confidence" },
  { key: "search_success_rate", title: "Search success rate", format: "percent", subtitle: "Queries with at least one result" },
  { key: "low_confidence_answers", title: "Low-confidence answers", format: "integer", subtitle: "Answers below 65% confidence" },
  { key: "average_response_time_ms", title: "Average response time", format: "ms", subtitle: "Mean latency per query" },
  { key: "high_severity_knowledge_gaps", title: "High-severity knowledge gaps", format: "integer", subtitle: "No results or critical gaps" },
  { key: "total_chunks_index", title: "Total chunks indexed", format: "integer", subtitle: "Chunks in vector store" },
];

function formatValue(value, format) {
  if (value == null && format !== "integer") return "—";
  switch (format) {
    case "percent":
      return value != null ? `${(Number(value) * 100).toFixed(1)}%` : "—";
    case "integer":
      return value != null ? Number(value).toLocaleString() : "0";
    case "ms":
      return value != null ? `${Number(value).toFixed(0)} ms` : "—";
    default:
      return value != null ? String(value) : "—";
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(28);

  const fetchMetrics = useCallback(async (projectId = null, daysVal = 28) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getMetrics(projectId, daysVal);
      setMetrics(data);
    } catch (e) {
      setError(e?.message || "Failed to load dashboard metrics");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Dashboard",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  useEffect(() => {
    fetchMetrics(null, days);
  }, [days, fetchMetrics]);

  return (
    <AppShell>
      <>
        <header className="headerRow">
          <div>
            <h1 className="pageTitle">RFP Dashboard</h1>
            <div className="pageSub">Search & answer metrics overview</div>
          </div>

          <div className="rangeSwitch">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                className={`rangeBtn ${days === opt.days ? "rangeBtnActive" : ""}`}
                onClick={() => setDays(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <section className="dashboardError">
            <span className="dashboardErrorText">{error}</span>
            <button type="button" className="ghostBtn" onClick={() => fetchMetrics(null, days)}>
              Retry
            </button>
          </section>
        )}

        {loading && !metrics && (
          <section className="dashboardLoading">
            <div className="dashboardSpinner" aria-hidden />
            <p>Loading metrics…</p>
          </section>
        )}

        {!loading && metrics && (
          <section className="topCards dashboardMetricsGrid">
            {METRIC_CARDS.map((card) => (
              <div key={card.key} className="miniCard dashboardMetricCard">
                <div className="miniCardTop">
                  <div className="miniCardTitle">{card.title}</div>
                </div>
                <div className="dashboardMetricValue">
                  {formatValue(metrics[card.key], card.format)}
                </div>
                <div className="miniCardSub">{card.subtitle}</div>
              </div>
            ))}
          </section>
        )}
      </>
    </AppShell>
  );
}
