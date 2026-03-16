"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateRangeFilterDropdown, toDateString } from "../components/DatePickerCalendar";
import { accessIntelligence } from "../../lib/api";
import "../css/accessintelligence.css";

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return "—";
  const d = new Date(dateTimeStr);
  const now = new Date();
  const today = toDateString(now);
  const dateStr = toDateString(d);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (dateStr === today) return `${time} · Today`;
  const yesterday = toDateString(new Date(now.getTime() - 86400000));
  if (dateStr === yesterday) return `${time} · Yesterday`;
  return `${time} · ${d.toLocaleDateString()}`;
}

function accessLevelLabel(level) {
  if (level === "high_security") return "High security";
  if (level === "team_specific") return "Team";
  return "Open for all";
}

function actionLabel(action) {
  if (action === "view") return "Viewed";
  if (action === "download") return "Downloaded";
  if (action === "upload") return "Uploaded";
  return action;
}

export default function AccessIntelligence() {
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [customDateStart, setCustomDateStart] = useState(null);
  const [customDateEnd, setCustomDateEnd] = useState(null);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const { from_date, to_date } = useMemo(() => {
    const today = todayStr;
    if (dateRangeFilter === "today") return { from_date: today, to_date: today };
    if (dateRangeFilter === "last7") {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from_date: toDateString(from), to_date: today };
    }
    if (dateRangeFilter === "last30") {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from_date: toDateString(from), to_date: today };
    }
    if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
      return { from_date: customDateStart, to_date: customDateEnd };
    }
    return { from_date: undefined, to_date: undefined };
  }, [dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["access-intelligence", "logs", from_date, to_date],
    queryFn: () => accessIntelligence.list({ from_date, to_date, limit: 500 }),
    staleTime: 60 * 1000,
  });

  const items = data?.items ?? [];
  const sensitiveFrequency = useMemo(() => {
    const highSecurity = items.filter((row) => row.access_level === "high_security");
    const byDoc = {};
    for (const row of highSecurity) {
      const name = row.document_name || "Unknown";
      byDoc[name] = (byDoc[name] || 0) + 1;
    }
    return Object.entries(byDoc)
      .map(([document, accessCount]) => ({ document, accessCount, level: "high_security" }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }, [items]);

  return (
    <div className="aiPage">
      <header className="aiHeader">
        <h1 className="aiTitle">Access Intelligence</h1>
        <p className="aiSubtitle">
          Who accessed which document, sensitive document access frequency, and suspicious activity alerts. Strong compliance positioning.
        </p>
        <div className="aiRangeWrap">
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
            wrapClassName="aiDateRangeWrap"
          />
        </div>
      </header>

      {/* Document access table */}
      <section className="aiSection">
        <div className="aiTableWrap">
          <table className="aiTable">
            <thead>
              <tr>
                <th>User</th>
                <th>Document</th>
                <th>Access level</th>
                <th>Action</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="aiMuted" style={{ padding: 24, textAlign: "center" }}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="aiMuted" style={{ padding: 24, textAlign: "center", color: "#c00" }}>
                    {error?.message ?? "Failed to load access logs"}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="aiMuted" style={{ padding: 24, textAlign: "center" }}>
                    No access logs in this date range.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td><span className="aiUser">{row.username}</span></td>
                    <td>{row.document_name}</td>
                    <td>
                      <span className={`aiAccessBadge aiAccessBadge-${row.access_level || "open_for_all"}`}>
                        {accessLevelLabel(row.access_level)}
                      </span>
                    </td>
                    <td>{actionLabel(row.action)}</td>
                    <td className="aiMuted">{formatDateTime(row.date_time)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensitive document access frequency */}
      <section className="aiSection">
        <h2 className="aiSectionTitle">Sensitive document access frequency</h2>
        <p className="aiSectionHint">High-security documents — access count over selected period.</p>
        <div className="aiCards">
          {sensitiveFrequency.length === 0 ? (
            <p className="aiMuted">No high-security document access in this period.</p>
          ) : (
            sensitiveFrequency.map((item, idx) => (
              <div key={idx} className="aiFreqCard">
                <div className="aiFreqDoc">{item.document}</div>
                <div className="aiFreqCount">{item.accessCount}</div>
                <div className="aiFreqLabel">accesses</div>
                <span className={`aiAccessBadge aiAccessBadge-${item.level}`}>High security</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
