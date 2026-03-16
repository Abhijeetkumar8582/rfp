"use client";
import React, { useEffect, useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, dashboard as dashboardApi } from "../../lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
  { key: "total_chunks_index", title: "Chunks in vector DB", format: "integer", subtitle: "Total chunks in vector store" },
];

const CHART_COLORS = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#94a3b8",
  answered: "#22c55e",
  unanswered: "#ef4444",
  lowConfidence: "#f59e0b",
  needsClarification: "#8b5cf6",
  other: "#64748b",
};

/** Colorful palette for Answer status breakdown pie (vivid, distinct) */
const ANSWER_STATUS_PIE_COLORS = [
  "#10b981", /* emerald */
  "#f43f5e", /* rose */
  "#f97316", /* orange */
  "#8b5cf6", /* violet */
  "#06b6d4", /* cyan */
  "#eab308", /* yellow */
  "#ec4899", /* pink */
  "#14b8a6", /* teal */
];

function interpolateColorChannel(start, end, t) {
  return Math.round(start + (end - start) * t);
}

/** Map latency to a grey → green → red color for the heat map. */
function getLatencyHeatColor(value, min, max) {
  const v = Number(value);
  if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return "#e5e7eb";
  }
  const ratio = (v - min) / (max - min || 1);
  const t = Math.max(0, Math.min(1, ratio));

  const grey = { r: 229, g: 231, b: 235 };  // #e5e7eb
  const green = { r: 22, g: 163, b: 74 };   // #16a34a
  const red = { r: 220, g: 38, b: 38 };     // #dc2626

  let from, to, localT;
  if (t < 0.5) {
    from = grey;
    to = green;
    localT = t * 2;
  } else {
    from = green;
    to = red;
    localT = (t - 0.5) * 2;
  }

  const r = interpolateColorChannel(from.r, to.r, localT);
  const g = interpolateColorChannel(from.g, to.g, localT);
  const b = interpolateColorChannel(from.b, to.b, localT);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Bar chart: low latency = green, high = red (fade from green to red as value increases). */
function getLatencyBarColor(value, min, max) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "#94a3b8";
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return "#22c55e"; // same or no range = green
  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  const green = { r: 34, g: 197, b: 94 };   // #22c55e
  const red = { r: 239, g: 68, b: 68 };     // #ef4444
  const r = interpolateColorChannel(green.r, red.r, t);
  const g = interpolateColorChannel(green.g, red.g, t);
  const b = interpolateColorChannel(green.b, red.b, t);
  return `rgb(${r}, ${g}, ${b})`;
}

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

function formatShortDate(dateStr) {
  if (dateStr == null || dateStr === "") return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHourOfDay(hour) {
  if (hour == null || Number.isNaN(Number(hour))) return "";
  const h = Number(hour) % 24;
  const date = new Date(Date.UTC(1970, 0, 1, h, 0, 0));
  return date.toLocaleTimeString(undefined, { hour: "numeric", hour12: true });
}

/** Ensure value is an array (Recharts and .map() require iterables; API may return a number). */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Normalize analytics API chart response: always return arrays for each series. Handles flat, wrapped, or camelCase. */
function normalizeChartData(data) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  if (data == null || typeof data !== "object") return emptyChartData();
  const raw = (data.data != null && typeof data.data === "object" && !Array.isArray(data.data))
    ? data.data
    : data;
  return {
    search_volume_trend: arr(raw.search_volume_trend ?? raw.searchVolumeTrend),
    confidence_trend: arr(raw.confidence_trend ?? raw.confidenceTrend),
    answer_status_breakdown: arr(raw.answer_status_breakdown ?? raw.answerStatusBreakdown),
    response_time_trend: arr(raw.response_time_trend ?? raw.responseTimeTrend),
    feedback_sentiment: arr(raw.feedback_sentiment ?? raw.feedbackSentiment),
    response_time_heatmap: arr(raw.response_time_heatmap ?? raw.responseTimeHeatmap),
  };
}

function emptyChartData() {
  return {
    search_volume_trend: [],
    confidence_trend: [],
    answer_status_breakdown: [],
    response_time_trend: [],
    feedback_sentiment: [],
    response_time_heatmap: [],
  };
}

/* Metric card icons (small 20px SVGs) */
const IconPercent = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);
const IconTrendUp = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconAlert = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconUsers = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconCheck = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconClock = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconDatabase = () => (
  <svg className="dashboardMetricIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const METRIC_ICONS = {
  overall_answer_accuracy: IconPercent,
  total_questions_answered: IconTrendUp,
  total_unanswered_questions: IconAlert,
  total_active_users: IconUsers,
  average_confidence_score: IconPercent,
  search_success_rate: IconCheck,
  low_confidence_answers: IconAlert,
  average_response_time_ms: IconClock,
  high_severity_knowledge_gaps: IconAlert,
  total_chunks_index: IconDatabase,
};

/** Colorful icon background per metric (class name in dashboard.css) */
const METRIC_ICON_COLORS = {
  overall_answer_accuracy: "dashboardMetricIconBlue",
  total_questions_answered: "dashboardMetricIconGreen",
  total_unanswered_questions: "dashboardMetricIconRed",
  total_active_users: "dashboardMetricIconViolet",
  average_confidence_score: "dashboardMetricIconCyan",
  search_success_rate: "dashboardMetricIconGreen",
  low_confidence_answers: "dashboardMetricIconAmber",
  average_response_time_ms: "dashboardMetricIconBlue",
  high_severity_knowledge_gaps: "dashboardMetricIconRed",
  total_chunks_index: "dashboardMetricIconPurple",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(28);
  const confidenceGradientId = useId().replace(/:/g, "-");
  const projectId = null;

  const {
    data: metrics,
    isLoading: loading,
    isError: metricsError,
    error: metricsErr,
    refetch: refetchMetrics,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["dashboard", "metrics", projectId, days],
    queryFn: () => dashboardApi.getMetrics(projectId, days),
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: rawChartData,
    isLoading: chartsLoading,
    refetch: refetchCharts,
  } = useQuery({
    queryKey: ["dashboard", "chart", projectId, days],
    queryFn: async () => {
      const data = await dashboardApi.getChartData(projectId, days);
      return normalizeChartData(data != null && typeof data === "object" ? data : {});
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const chartData = rawChartData ?? emptyChartData();
  const error = metricsError ? (metricsErr?.message || "Failed to load dashboard metrics") : null;
  const dataUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  useEffect(() => {
    if (typeof activityApi?.create !== "function") return;
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Dashboard",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  const retry = () => {
    refetchMetrics();
    refetchCharts();
  };

  const answerStatusColors = (status, index) => {
    return ANSWER_STATUS_PIE_COLORS[index % ANSWER_STATUS_PIE_COLORS.length];
  };

  const feedbackColors = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "positive") return CHART_COLORS.positive;
    if (s === "negative") return CHART_COLORS.negative;
    return CHART_COLORS.neutral;
  };

  const latencyHeatmapData = (() => {
    const rawPoints = ensureArray(chartData?.response_time_heatmap);
    const effectiveDays = Math.max(1, Number(days) || 28);

    // Always synthesise a continuous range of dates based on the selected window
    const today = new Date();
    const allDates = [];
    for (let i = effectiveDays - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDates.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }

    // Show 7 time-of-day bands with 4-hour gaps, like:
    // 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM, 12 AM
    const hours = [0, 4, 8, 12, 16, 20, 24];

    // Map of actual latency values: values[date][hour] = avg_ms
    const values = {};
    for (const p of rawPoints) {
      if (!p?.date || p.hour == null) continue;
      const d = p.date;
      const h = Number(p.hour);
      if (!Number.isFinite(h)) continue;
      if (!values[d]) values[d] = {};
      const v = Number(p.avg_ms);
      if (!Number.isFinite(v)) continue;
      values[d][h] = v;
    }

    let min = Infinity;
    let max = -Infinity;

    // Compress full date range into up to 15 visible columns on the heatmap
    const TARGET_COLUMNS = 15;
    const bucketCount = Math.min(TARGET_COLUMNS, Math.max(0, allDates.length));

    const buckets = [];
    for (let i = 0; i < bucketCount; i += 1) {
      const startIdx = Math.floor((i * allDates.length) / bucketCount);
      const endIdx = Math.floor(((i + 1) * allDates.length) / bucketCount);
      const indices = [];
      for (let idx = startIdx; idx < endIdx && idx < allDates.length; idx += 1) {
        indices.push(idx);
      }
      const labelIdx = indices[Math.floor(indices.length / 2)] ?? indices[0] ?? 0;
      const labelDate = allDates[labelIdx] ?? allDates[0];
      buckets.push({ labelDate, indices });
    }

    const rows = hours.map((hour) => {
      const cells = buckets.map((bucket, colIdx) => {
        let sum = 0;
        let count = 0;
        for (const idx of bucket.indices) {
          const date = allDates[idx];
          const v = values[date]?.[hour];
          const numeric = Number(v);
          if (Number.isFinite(numeric)) {
            sum += numeric;
            count += 1;
          }
        }
        const avg = count > 0 ? sum / count : null;
        if (avg !== null) {
          if (avg < min) min = avg;
          if (avg > max) max = avg;
        }
        return {
          key: `${bucket.labelDate}-${hour}-${colIdx}`,
          date: bucket.labelDate,
          hour,
          value: avg,
        };
      });
      return { hour, cells };
    });

    const LOW_BOUND = 100;
    const HIGH_BOUND = 2000;

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      // No real data: fixed neutral scale so all cells render in grey
      min = LOW_BOUND;
      max = HIGH_BOUND;
    } else {
      // Clamp display scale to fixed bounds, regardless of actual min/max
      min = LOW_BOUND;
      max = HIGH_BOUND;
    }

    const dates = buckets.map((b) => b.labelDate);

    return { rows, dates, min, max };
  })();

  const heatmapLabelStride = days <= 7 ? 1 : 7;

  const showMetricsSkeleton = loading && !metrics;
  const showChartsSkeleton = chartsLoading && !chartData;

  return (
    <AppShell>
      <>
        <header className="headerRow">
          <div>
            <h1 className="pageTitle">Dashboard</h1>
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
            <button type="button" className="ghostBtn" onClick={retry}>
              Retry
            </button>
          </section>
        )}

        {showMetricsSkeleton && (
          <section className="topCards dashboardMetricsGrid dashboardSkeletonGrid" aria-busy="true" aria-label="Loading metrics">
            {METRIC_CARDS.map((card) => (
              <div key={card.key} className="miniCard dashboardMetricCard dashboardSkeletonCard">
                <div className="miniCardTop">
                  <div className="dashboardSkeleton dashboardSkeletonTitle" />
                  <div className="dashboardSkeleton dashboardSkeletonIcon" aria-hidden />
                </div>
                <div className="dashboardSkeleton dashboardSkeletonValue" />
                <div className="dashboardSkeleton dashboardSkeletonSub" />
              </div>
            ))}
          </section>
        )}

        {!loading && metrics && (
          <section className="topCards dashboardMetricsGrid">
            {METRIC_CARDS.map((card) => {
              const IconComponent = METRIC_ICONS[card.key];
              const iconColorClass = METRIC_ICON_COLORS[card.key] || "dashboardMetricIconBlue";
              return (
                <div key={card.key} className="miniCard dashboardMetricCard">
                  <div className="miniCardTop">
                    <div className="miniCardTitle">{card.title}</div>
                    {IconComponent && (
                      <div className={`dashboardMetricIconWrap ${iconColorClass}`} aria-hidden>
                        <IconComponent />
                      </div>
                    )}
                  </div>
                  <div className="dashboardMetricValue">
                    {formatValue(metrics != null ? metrics[card.key] : undefined, card.format)}
                  </div>
                  <div className="miniCardSub">{card.subtitle}</div>
                </div>
              );
            })}
          </section>
        )}

        {/* Row 1: Search volume trend, Confidence trend */}
        <section className="dashboardChartsRow">
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle">Search volume trend</h3>
            <p className="dashboardChartSub">Total searches over time</p>
            <div className="dashboardChartArea">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton" aria-hidden />
              ) : ensureArray(chartData?.search_volume_trend).length > 0 ? (
                <div className="dashboardChartInner" style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ensureArray(chartData?.search_volume_trend)} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip labelFormatter={formatShortDate} formatter={(value) => [value, "Searches"]} />
                      <Bar dataKey="count" name="Searches" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboardChartPlaceholder">No search data in this period</div>
              )}
            </div>
          </div>
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle">Confidence trend</h3>
            <p className="dashboardChartSub">Average confidence over time</p>
            <div className="dashboardChartArea">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton" aria-hidden />
              ) : ensureArray(chartData?.confidence_trend).length > 0 ? (
                <div className="dashboardChartInner dashboardChartInnerArea" style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={ensureArray(chartData?.confidence_trend)} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id={confidenceGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => (v != null && Number.isFinite(Number(v)) ? `${Math.round(Number(v) * 100)}%` : "")} />
                      <Tooltip labelFormatter={formatShortDate} formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Avg confidence"]} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Avg confidence"
                        stroke="#16a34a"
                        strokeWidth={2}
                        fill={`url(#${confidenceGradientId})`}
                        dot={{ r: 3, fill: "#16a34a" }}
                        activeDot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboardChartPlaceholder">No confidence data in this period</div>
              )}
            </div>
          </div>
        </section>

        {/* Row 2: Answer status breakdown (PieChart), Response time trend */}
        <section className="dashboardChartsRow">
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle dashboardChartTitleColored">Answer status breakdown</h3>
            <p className="dashboardChartSub">Quality outcome distribution</p>
            <div className="dashboardChartArea">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton" aria-hidden />
              ) : ensureArray(chartData?.answer_status_breakdown).length > 0 ? (
                <div className="dashboardChartInner" style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={ensureArray(chartData?.answer_status_breakdown)}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {ensureArray(chartData?.answer_status_breakdown).map((entry, i) => (
                          <Cell key={`answer-${i}-${entry?.status ?? ""}`} fill={answerStatusColors(entry?.status, i)} stroke="#fff" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboardChartPlaceholder">No answer status data in this period</div>
              )}
            </div>
          </div>
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle">Response time trend</h3>
            <p className="dashboardChartSub">Average search latency over time (ms)</p>
            <div className="dashboardChartArea">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton" aria-hidden />
              ) : (() => {
                const trendData = ensureArray(chartData?.response_time_trend);
                if (trendData.length === 0) return <div className="dashboardChartPlaceholder">No latency data in this period</div>;
                const values = trendData.map((d) => Number(d?.value)).filter(Number.isFinite);
                const min = values.length ? Math.min(...values) : 0;
                const max = values.length ? Math.max(...values) : 1;
                const barData = trendData.map((d) => ({ ...d, fill: getLatencyBarColor(Number(d?.value), min, max) }));
                return (
                  <div className="dashboardChartInner" style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#6b7280" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => (v != null ? `${Number(v)} ms` : "")} />
                        <Tooltip labelFormatter={formatShortDate} formatter={(value) => [`${Number(value).toFixed(0)} ms`, "Avg latency"]} />
                        <Bar
                          dataKey="value"
                          name="Avg latency (ms)"
                          radius={[4, 4, 0, 0]}
                          shape={(props) => {
                            const { x, y, width, height, payload } = props ?? {};
                            const px = Number.isFinite(Number(x)) ? Number(x) : 0;
                            const py = Number.isFinite(Number(y)) ? Number(y) : 0;
                            const w = Math.max(0, Number(width)) || 0;
                            const h = Math.max(0, Number(height)) || 0;
                            const fill = (payload && typeof payload.fill === "string") ? payload.fill : "#94a3b8";
                            return <rect x={px} y={py} width={w} height={h} fill={fill} />;
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Row 2b: Response time heat map + Feedback sentiment (same row) */}
        <section className="dashboardChartsRow">
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle">Response time heat map</h3>
            <p className="dashboardChartSub">Average search latency by time of day (relative scale)</p>
            <div className="dashboardChartArea dashboardChartAreaWide">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton dashboardChartSkeletonWide" aria-hidden />
              ) : latencyHeatmapData.rows.length > 0 && latencyHeatmapData.dates.length > 0 ? (
                <div className="dashboardHeatmap">
                  <div className="dashboardHeatmapBody">
                    <div className="dashboardHeatmapYAxis">
                      {latencyHeatmapData.rows.map((row) => (
                        <div key={`heatmap-y-${row.hour}`} className="dashboardHeatmapYAxisLabel">
                          {formatHourOfDay(row.hour)}
                        </div>
                      ))}
                    </div>
                    <div className="dashboardHeatmapGrid">
                      {latencyHeatmapData.rows.map((row) => (
                        <div key={`heatmap-row-${row.hour}`} className="dashboardHeatmapRow" aria-label={formatHourOfDay(row.hour)}>
                          {row.cells.map((cell) => (
                            <div
                              key={cell.key}
                              className="dashboardHeatmapCell"
                              style={{ backgroundColor: getLatencyHeatColor(cell.value, latencyHeatmapData.min, latencyHeatmapData.max) }}
                              aria-label={`${formatHourOfDay(cell.hour)} ${formatShortDate(cell.date)}: ${cell.value != null ? Math.round(cell.value) : "No data"} ms`}
                            >
                              {cell.value != null && (
                                <span className="dashboardHeatmapCellValue">{Math.round(cell.value)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    className="dashboardHeatmapXAxis"
                    aria-hidden
                    style={{ gridTemplateColumns: `repeat(${latencyHeatmapData.dates.length}, minmax(0, 1fr))` }}
                  >
                    {latencyHeatmapData.dates.map((date, idx) => {
                      const isTick =
                        days <= 7
                          ? true
                          : idx % heatmapLabelStride === 0 || idx === latencyHeatmapData.dates.length - 1;
                      return (
                        <div key={date} className="dashboardHeatmapXAxisLabel">
                          {isTick ? formatShortDate(date) : ""}
                        </div>
                      );
                    })}
                  </div>
                  <div className="dashboardHeatmapLegend" aria-hidden>
                    <span className="dashboardHeatmapLegendLabel">{`${Math.round(latencyHeatmapData.min)} ms`}</span>
                    <div className="dashboardHeatmapLegendBar" />
                    <span className="dashboardHeatmapLegendLabel">{`${Math.round(latencyHeatmapData.max)} ms`}</span>
                  </div>
                </div>
              ) : (
                <div className="dashboardChartPlaceholder">No latency data in this period</div>
              )}
            </div>
          </div>
          <div className="dashboardChartPanel">
            <h3 className="dashboardChartTitle">Feedback sentiment</h3>
            <p className="dashboardChartSub">Overall snapshot — user trust and answer satisfaction</p>
            <div className="dashboardChartArea dashboardChartAreaWide">
              {showChartsSkeleton ? (
                <div className="dashboardChartSkeleton dashboardChartSkeletonWide" aria-hidden />
              ) : ensureArray(chartData?.feedback_sentiment).length > 0 ? (
                <div className="dashboardChartInner dashboardChartInnerWide dashboardFeedbackDonutWrap" style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={ensureArray(chartData?.feedback_sentiment)}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                      >
                        {ensureArray(chartData?.feedback_sentiment).map((entry, i) => (
                          <Cell key={`feedback-${i}-${entry?.status ?? ""}`} fill={feedbackColors(entry?.status)} stroke="#fff" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {(() => {
                    const total = ensureArray(chartData?.feedback_sentiment).reduce((s, d) => s + (Number(d?.count) || 0), 0);
                    return total > 0 ? (
                      <div className="dashboardFeedbackDonutCenter" aria-hidden>
                        <span className="dashboardFeedbackDonutTotal">{total.toLocaleString()}</span>
                        <span className="dashboardFeedbackDonutLabel">Total</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="dashboardChartPlaceholder">No feedback data in this period</div>
              )}
            </div>
          </div>
        </section>

        {(metrics || chartData) && (
          <footer className="dashboardFooter">
            <span className="dashboardUpdated">
              Data updated: {dataUpdated ? dataUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }) + " UTC" : "—"}
            </span>
          </footer>
        )}
      </>
    </AppShell>
  );
}
