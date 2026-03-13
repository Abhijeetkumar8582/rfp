"use client";

import React, { useState } from "react";
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

export default function AccessIntelligence() {
  const [range, setRange] = useState("Last 30 days");

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
              {seedAccessLog.map((row) => (
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
    </div>
  );
}
