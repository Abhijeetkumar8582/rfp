"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi } from "../../lib/api";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPill, setFilterPill] = useState("All"); // All | Critical | Security | Adv. Filter

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Activity Log",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await activityApi.list({ limit: 200 });
      setEvents(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || "Failed to load activity logs");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (filterPill === "Critical") list = list.filter((e) => (e.severity || "").toLowerCase() === "critical");
    else if (filterPill === "Security") list = list.filter((e) => {
      const s = (e.severity || "").toLowerCase();
      return s === "security" || s === "critical";
    });
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        (e.actor || "").toLowerCase().includes(q) ||
        (e.ip_address || "").toLowerCase().includes(q) ||
        (e.event_action || "").toLowerCase().includes(q) ||
        (e.target_resource || "").toLowerCase().includes(q)
    );
  }, [events, search, filterPill]);

  const securityCount = useMemo(() =>
    events.filter((e) => { const s = (e.severity || "").toLowerCase(); return s === "security" || s === "critical"; }).length,
    [events]
  );
  const adminCount = useMemo(() =>
    events.filter((e) => (e.severity || "").toLowerCase() === "admin").length,
    [events]
  );

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
          <div className="glStatValue">{events.length}</div>
          <div className="glStatLabel">Total Events</div>
          <div className="glStatMeta">Platform activity</div>
        </div>
        <div className="glStatCard glStatCard-flag">
          <div className="glStatValue">{securityCount}</div>
          <div className="glStatLabel">Security Flags</div>
          <div className="glStatMeta">Requires Review</div>
        </div>
        <div className="glStatCard">
          <div className="glStatValue">{adminCount}</div>
          <div className="glStatLabel">Admin Actions</div>
          <div className="glStatMeta">Config Changes</div>
        </div>
        <div className="glStatCard glStatCard-score">
          <div className="glStatValue">{filteredEvents.length}</div>
          <div className="glStatLabel">Filtered</div>
          <div className="glStatMeta">Current view</div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="glToolbar">
        <div className="glFilters">
          {["All", "Critical", "Security", "Adv. Filter"].map((pill) => (
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
        <div className="glSearchWrap">
          <span className="glSearchIcon" aria-hidden>🔎</span>
          <input
            type="text"
            className="glSearchInput"
            placeholder="Search logs (User, IP, Action)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="glTableEmpty">
                    {events.length === 0 ? "No activity logs yet. Actions across the app will appear here." : "No events match your filters."}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((row) => (
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
    </div>
  );
}
