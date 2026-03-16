"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi } from "../../lib/api";
import { DateRangeFilterDropdown, toDateString } from "../components/DatePickerCalendar";
import "../css/logs.css";

const severityLabel = {
  info: "Normal",
  normal: "Normal",
  security: "Security",
  admin: "Admin",
  warning: "Warning",
  error: "Error",
  critical: "Critical",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return ts;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export default function ActivityLog() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalLast7Days, setTotalLast7Days] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPill, setFilterPill] = useState("All"); // All | Critical | Security | 
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [customDateStart, setCustomDateStart] = useState(null);
  const [customDateEnd, setCustomDateEnd] = useState(null);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Activity Log",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * pageSize;
      const params = { skip, limit: pageSize };
      if (filterPill === "Critical") params.severity = "critical";
      else if (filterPill === "Security") params.severity_in = "critical,security";
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
      const res = await activityApi.list(params);
      const items = res?.items ?? [];
      setEvents(Array.isArray(items) ? items : []);
      setTotal(typeof res?.total === "number" ? res.total : 0);
      setTotalLast7Days(typeof res?.total_last_7_days === "number" ? res.total_last_7_days : 0);
    } catch (e) {
      setError(e?.message || "Failed to load activity logs");
      setEvents([]);
      setTotal(0);
      setTotalLast7Days(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filterPill, dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, filterPill, dateRangeFilter, customDateStart, customDateEnd, fetchLogs]);

  const securityCount = useMemo(() =>
    events.filter((e) => { const s = (e.severity || "").toLowerCase(); return s === "security" || s === "critical"; }).length,
    [events]
  );
  const adminCount = useMemo(() =>
    events.filter((e) => (e.severity || "").toLowerCase() === "admin").length,
    [events]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (currentPage - 1) * pageSize;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPill, dateRangeFilter, customDateStart, customDateEnd]);

  return (
    <div className="glPage">
      <header className="glHeader">
        <div className="glHeaderText">
          <h1 className="glTitle">Governance Ledger</h1>
          <p className="glSubtitle">Immutable record of security events and platform activity.</p>
        </div>
        <button type="button" className="glExportBtn" onClick={fetchLogs} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="glError" role="alert" style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="glStats">
        <div className="glStatCard">
          <div className="glStatValue">{total}</div>
          <div className="glStatLabel">Total Events</div>
          <div className="glStatMeta">Matching filters</div>
        </div>
        <div className="glStatCard glStatCard-score">
          <div className="glStatValue">{totalLast7Days}</div>
          <div className="glStatLabel">Last 7 Days</div>
          <div className="glStatMeta">Total in past week</div>
        </div>
        <div className="glStatCard glStatCard-flag">
          <div className="glStatValue">{securityCount}</div>
          <div className="glStatLabel">Security Flags</div>
          <div className="glStatMeta">On this page</div>
        </div>
        <div className="glStatCard">
          <div className="glStatValue">{adminCount}</div>
          <div className="glStatLabel">Admin Actions</div>
          <div className="glStatMeta">On this page</div>
        </div>
      </div>

      {/* Filters + Date range */}
      <div className="glToolbar">
        <div className="glFilters">
          {["All", "Critical", "Security"].map((pill) => (
            <button
              key={pill}
              type="button"
              className={`glFilterPill ${filterPill === pill ? "glFilterPill-active" : ""}`}
              onClick={() => setFilterPill(pill)}
            >
              {pill}
            </button>
          ))}
        </div>
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
          wrapClassName="glDateRangeWrap"
        />
      </div>

      {/* Table */}
      <div className="glTableWrap">
        {loading ? (
          <div className="glTableEmpty" style={{ padding: 32, textAlign: "center", color: "#666" }}>
            Loading activity logs…
          </div>
        ) : (
          <table className="glTable">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Event Action</th>
                <th>Target Resource</th>
                <th>IP</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="glTableEmpty">
                    {total === 0 ? "No activity logs yet. Actions across the app will appear here." : "No events match your filters."}
                  </td>
                </tr>
              ) : (
                events.map((row) => (
                  <tr key={row.id}>
                    <td className="glCell glCell-time">{formatTimestamp(row.timestamp)}</td>
                    <td className="glCell">{row.actor ?? "—"}</td>
                    <td className="glCell">{row.event_action ?? "—"}</td>
                    <td className="glCell glCell-target">{row.target_resource ?? "—"}</td>
                    <td className="glCell">{row.ip_address ?? "—"}</td>
                    <td className="glCell">
                      <span className={`glSeverity glSeverity-${(row.severity || "info").toLowerCase()}`}>
                        {severityLabel[(row.severity || "info").toLowerCase()] ?? row.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="glPagination">
          <div className="glPaginationInfo">
            Showing {pageStart + 1}–{Math.min(pageStart + events.length, total)} of {total}
          </div>
          <div className="glPaginationControls">
            <select
              className="glPaginationPageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
            <button
              type="button"
              className="glPaginationBtn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="glPaginationPageNum">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="glPaginationBtn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
