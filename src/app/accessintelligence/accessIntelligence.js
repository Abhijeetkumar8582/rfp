"use client";

import React, { useMemo, useState } from "react";
import "../css/accessintelligence.css";

// Seed data: who accessed which document (in production from API)
const seedAccessLog = [
  { id: 1, user: "John Doe", document: "sso_security_policy.pdf", action: "Viewed", time: "12:45 PM", date: "Today", level: "high_security" },
  { id: 2, user: "Sarah Malik", document: "gdpr_compliance_checklist.xlsx", action: "Viewed", time: "11:22 AM", date: "Today", level: "high_security" },
  { id: 3, user: "John Doe", document: "companies_demo_export_xlsx", action: "Downloaded", time: "10:08 AM", date: "Today", level: "open_for_all" },
  { id: 4, user: "Wirdan Athok", document: "api_integration_spec.xlsx", action: "Viewed", time: "09:33 AM", date: "Today", level: "open_for_all" },
  { id: 5, user: "Tea Assiddiq", document: "sso_security_policy.pdf", action: "Viewed", time: "04:15 PM", date: "Yesterday", level: "high_security" },
  { id: 6, user: "Sarah Malik", document: "system_architecture_diagram.pdf", action: "Downloaded", time: "02:50 PM", date: "Yesterday", level: "team_specific" },
];

// Sensitive document access frequency (high_security docs)
const seedSensitiveFrequency = [
  { document: "sso_security_policy.pdf", accessCount: 47, level: "high_security" },
  { document: "gdpr_compliance_checklist.xlsx", accessCount: 32, level: "high_security" },
];

// Suspicious activity alerts
const seedAlerts = [
  { id: 1, type: "suspicious", title: "Unusual access pattern", desc: "Multiple failed open attempts on high-security document from IP outside usual range.", time: "11:58 AM", date: "Today", severity: "high" },
  { id: 2, type: "info", title: "Bulk download attempt", desc: "User requested download of 12 documents in 2 minutes; rate limit applied.", time: "09:12 AM", date: "Yesterday", severity: "medium" },
  { id: 3, type: "info", title: "New device login", desc: "First login from new device for user Sarah Malik; verification sent.", time: "08:00 AM", date: "Yesterday", severity: "low" },
];

export default function AccessIntelligence() {
  const [range, setRange] = useState("Last 30 days");
  const [filterUser, setFilterUser] = useState("");

  const accessLog = useMemo(() => {
    if (!filterUser.trim()) return seedAccessLog;
    const q = filterUser.trim().toLowerCase();
    return seedAccessLog.filter((r) => r.user.toLowerCase().includes(q) || r.document.toLowerCase().includes(q));
  }, [filterUser]);

  return (
    <div className="aiPage">
      <header className="aiHeader">
        <h1 className="aiTitle">Access Intelligence</h1>
        <p className="aiSubtitle">
          Who accessed which document, sensitive document access frequency, and suspicious activity alerts. Strong compliance positioning.
        </p>
        <div className="aiRangeWrap">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="aiRangeSelect">
            <option>Last 7 days</option>
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </header>

      {/* Compliance positioning */}
      <section className="aiCompliance">
        <div className="aiComplianceBadge">Compliance</div>
        <h2 className="aiComplianceTitle">Document access control & audit trail</h2>
        <p className="aiComplianceBody">
          Full visibility into who accessed which document, with access levels (Open for all, Team specific, High security).
          Sensitive documents are name-only in answers — no open or download for unauthorized users. All access is logged for audit and compliance (SOC 2, GDPR, ISO 27001).
        </p>
      </section>

      {/* Who accessed which document */}
      <section className="aiSection">
        <h2 className="aiSectionTitle">Who accessed which document</h2>
        <div className="aiSearchWrap">
          <span className="aiSearchIcon">🔎</span>
          <input
            type="text"
            placeholder="Filter by user or document..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="aiSearchInput"
          />
        </div>
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
              {accessLog.map((row) => (
                <tr key={row.id}>
                  <td><span className="aiUser">{row.user}</span></td>
                  <td>{row.document}</td>
                  <td>
                    <span className={`aiAccessBadge aiAccessBadge-${row.level || "open_for_all"}`}>
                      {row.level === "high_security" ? "High security" : row.level === "team_specific" ? "Team" : "Open for all"}
                    </span>
                  </td>
                  <td>{row.action}</td>
                  <td className="aiMuted">{row.time} · {row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensitive document access frequency */}
      <section className="aiSection">
        <h2 className="aiSectionTitle">Sensitive document access frequency</h2>
        <p className="aiSectionHint">High-security documents — access count over selected period.</p>
        <div className="aiCards">
          {seedSensitiveFrequency.map((item, idx) => (
            <div key={idx} className="aiFreqCard">
              <div className="aiFreqDoc">{item.document}</div>
              <div className="aiFreqCount">{item.accessCount}</div>
              <div className="aiFreqLabel">accesses</div>
              <span className={`aiAccessBadge aiAccessBadge-${item.level}`}>High security</span>
            </div>
          ))}
        </div>
      </section>

      {/* Suspicious activity alerts */}
      <section className="aiSection">
        <h2 className="aiSectionTitle">Suspicious activity alerts</h2>
        <div className="aiAlerts">
          {seedAlerts.map((alert) => (
            <div key={alert.id} className={`aiAlert aiAlert-${alert.severity}`}>
              <div className="aiAlertHeader">
                <span className="aiAlertTitle">{alert.title}</span>
                <span className="aiAlertTime">{alert.time} · {alert.date}</span>
              </div>
              <p className="aiAlertDesc">{alert.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
