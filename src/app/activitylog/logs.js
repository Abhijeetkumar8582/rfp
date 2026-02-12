"use client";

import React, { useMemo, useState } from "react";
import "../css/logs.css";

// Seed data: governance ledger events (Timestamp, Actor, Event Action, Target Resource, Severity)
const seedEvents = [
  { id: 1, timestamp: "2026-02-13 12:45:32", actor: "John Doe", ip: "192.168.1.101", action: "Login", target: "Platform", severity: "normal" },
  { id: 2, timestamp: "2026-02-13 12:42:18", actor: "Sarah Malik", ip: "10.0.2.44", action: "Role changed", target: "User: Tea Assiddiq → RFP Reviewer", severity: "security" },
  { id: 3, timestamp: "2026-02-13 12:38:05", actor: "System", ip: "—", action: "Config updated", target: "Submission deadline → 30 Apr 2026", severity: "admin" },
  { id: 4, timestamp: "2026-02-13 12:12:00", actor: "John Doe", ip: "192.168.1.101", action: "Document viewed", target: "sso_security_policy.pdf", severity: "normal" },
  { id: 5, timestamp: "2026-02-13 11:58:22", actor: "Unknown", ip: "203.0.113.89", action: "Failed auth attempt", target: "High-security doc access", severity: "critical" },
  { id: 6, timestamp: "2026-02-13 11:42:10", actor: "Sarah Malik", ip: "10.0.2.44", action: "Setting updated", target: "Deadline config", severity: "admin" },
  { id: 7, timestamp: "2026-02-13 11:22:05", actor: "Wirdan Athok", ip: "192.168.1.105", action: "File uploaded", target: "RFP #RFP-1298", severity: "normal" },
  { id: 8, timestamp: "2026-02-13 10:12:33", actor: "System", ip: "—", action: "RFP status changed", target: "RFP-1298 Draft → In Review", severity: "normal" },
  { id: 9, timestamp: "2026-02-13 09:55:00", actor: "Tea Assiddiq", ip: "10.0.2.12", action: "Bulk download request", target: "12 documents (rate limited)", severity: "security" },
  { id: 10, timestamp: "2026-02-13 09:42:18", actor: "Admin", ip: "10.0.2.1", action: "Permission revoked", target: "User: temp_contractor", severity: "admin" },
  { id: 11, timestamp: "2026-02-12 17:30:00", actor: "John Doe", ip: "192.168.1.101", action: "Logout", target: "Platform", severity: "normal" },
  { id: 12, timestamp: "2026-02-12 16:15:44", actor: "Sarah Malik", ip: "10.0.2.44", action: "Export report", target: "Activity log (CSV)", severity: "admin" },
];

const severityLabel = {
  normal: "Normal",
  security: "Security",
  admin: "Admin",
  critical: "Critical",
};

export default function ActivityLog() {
  const [search, setSearch] = useState("");
  const [filterPill, setFilterPill] = useState("All"); // All | Critical | Security | Adv. Filter

  const filteredEvents = useMemo(() => {
    let list = seedEvents;
    if (filterPill === "Critical") list = list.filter((e) => e.severity === "critical");
    else if (filterPill === "Security") list = list.filter((e) => e.severity === "security" || e.severity === "critical");
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q)
    );
  }, [search, filterPill]);

  return (
    <div className="glPage">
      <header className="glHeader">
        <div className="glHeaderText">
          <h1 className="glTitle">Governance Ledger</h1>
          <p className="glSubtitle">Immutable record of security events and platform activity.</p>
        </div>
        <button type="button" className="glExportBtn">
          Export Report
        </button>
      </header>

      {/* Stats */}
      <div className="glStats">
        <div className="glStatCard">
          <div className="glStatValue">24,102</div>
          <div className="glStatLabel">Total Events (24h)</div>
          <div className="glStatMeta">Normal Volume</div>
        </div>
        <div className="glStatCard glStatCard-flag">
          <div className="glStatValue">2</div>
          <div className="glStatLabel">Security Flags</div>
          <div className="glStatMeta">Requires Review</div>
        </div>
        <div className="glStatCard">
          <div className="glStatValue">142</div>
          <div className="glStatLabel">Admin Actions</div>
          <div className="glStatMeta">Config Changes</div>
        </div>
        <div className="glStatCard glStatCard-score">
          <div className="glStatValue">98%</div>
          <div className="glStatLabel">Compliance Score</div>
          <div className="glStatMeta">FERPA Audit</div>
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
        <table className="glTable">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Event Action</th>
              <th>Target Resource</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="glTableEmpty">
                  No events match your filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((row) => (
                <tr key={row.id}>
                  <td className="glCell glCell-time">{row.timestamp}</td>
                  <td className="glCell">{row.actor}</td>
                  <td className="glCell">{row.action}</td>
                  <td className="glCell glCell-target">{row.target}</td>
                  <td className="glCell">
                    <span className={`glSeverity glSeverity-${row.severity}`}>
                      {severityLabel[row.severity]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
