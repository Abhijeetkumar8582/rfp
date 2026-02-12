import React from "react";
import AppShell from "../components/AppShell";
import "../css/project.css";

// Mock data for AI platform sections
const recentlyUploaded = [
  { name: "RFP_Terms_2025.pdf", time: "2 min ago", size: "2.4 MB" },
  { name: "Vendor_Response_Template.xlsx", time: "15 min ago", size: "892 KB" },
  { name: "Compliance_Checklist.pdf", time: "1 hour ago", size: "1.1 MB" },
  { name: "Pricing_Matrix_Q4.xlsx", time: "3 hours ago", size: "456 KB" },
];

const mostSearched = [
  { topic: "Payment terms", count: 142 },
  { topic: "SLA requirements", count: 98 },
  { topic: "Security compliance", count: 87 },
  { topic: "Pricing structure", count: 76 },
  { topic: "Delivery schedule", count: 64 },
];

const gapsInKnowledge = [
  { area: "Insurance requirements", priority: "high" },
  { area: "Data retention policies", priority: "medium" },
  { area: "Escalation procedures", priority: "low" },
];

const lowConfidenceAreas = [
  { section: "Section 4.2 — Liability limits", confidence: 62 },
  { section: "Section 7.1 — Termination clause", confidence: 58 },
  { section: "Appendix B — SLA metrics", confidence: 71 },
];

export default function IntelligenceHub() {
  return (
    <AppShell mainClassName="pmMain">
      {/* Header */}
      <div className="ihHeader">
        <div className="ihHeaderContent">
          <h1 className="ihTitle">Intelligence Hub</h1>
          <p className="ihSubtitle">
            AI-powered insights from your RFP knowledge base
          </p>
        </div>
        <div className="topSearch ihSearch">
          <span className="searchIcon">🔎</span>
          <input placeholder="Search across knowledge base..." />
        </div>
      </div>

      {/* Sections grid */}
      <div className="ihGrid">
        {/* Recently Uploaded Docs */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">📄</span>
            <h2 className="ihCardTitle">Recently Uploaded Docs</h2>
          </div>
          <ul className="ihDocList">
            {recentlyUploaded.map((doc) => (
              <li key={doc.name} className="ihDocItem">
                <div className="ihDocInfo">
                  <span className="ihDocName">{doc.name}</span>
                  <span className="ihDocMeta">{doc.time} · {doc.size}</span>
                </div>
              </li>
            ))}
          </ul>
          <a href="/filerepo" className="ihCardLink">View all →</a>
        </section>

        {/* Most Searched Topics */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">🔥</span>
            <h2 className="ihCardTitle">Most Searched Topics</h2>
          </div>
          <ul className="ihTopicList">
            {mostSearched.map((t) => (
              <li key={t.topic} className="ihTopicItem">
                <span className="ihTopicName">{t.topic}</span>
                <span className="ihTopicCount">{t.count} searches</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Gaps in Knowledge */}
        <section className="ihCard ihCardWarn">
          <div className="ihCardHeader">
            <span className="ihCardIcon">⚠️</span>
            <h2 className="ihCardTitle">Gaps in Knowledge</h2>
          </div>
          <p className="ihCardDesc">
            Areas with limited or missing documentation
          </p>
          <ul className="ihGapList">
            {gapsInKnowledge.map((g) => (
              <li key={g.area} className={`ihGapItem ihGap--${g.priority}`}>
                <span>{g.area}</span>
                <span className="ihGapBadge">{g.priority}</span>
              </li>
            ))}
          </ul>
          <button className="ihCardBtn">Review gaps</button>
        </section>

        {/* Low Confidence Areas */}
        <section className="ihCard ihCardWarn">
          <div className="ihCardHeader">
            <span className="ihCardIcon">📊</span>
            <h2 className="ihCardTitle">Low Confidence Areas</h2>
          </div>
          <p className="ihCardDesc">
            Sections where AI retrieval confidence is below 75%
          </p>
          <ul className="ihConfList">
            {lowConfidenceAreas.map((c) => (
              <li key={c.section} className="ihConfItem">
                <span className="ihConfSection">{c.section}</span>
                <div className="ihConfBarWrap">
                  <div
                    className={`ihConfBar ${c.confidence < 65 ? "ihConfBarLow" : ""}`}
                    style={{ width: `${c.confidence}%` }}
                  />
                </div>
                <span className="ihConfPct">{c.confidence}%</span>
              </li>
            ))}
          </ul>
          <button className="ihCardBtn">Improve coverage</button>
        </section>

        {/* Index Health */}
        <section className="ihCard ihCardFull">
          <div className="ihCardHeader">
            <span className="ihCardIcon">💚</span>
            <h2 className="ihCardTitle">Index Health</h2>
          </div>
          <div className="ihHealthGrid">
            <div className="ihHealthStat">
              <span className="ihHealthValue">94%</span>
              <span className="ihHealthLabel">Documents indexed</span>
            </div>
            <div className="ihHealthStat">
              <span className="ihHealthValue">12.4K</span>
              <span className="ihHealthLabel">Chunks in vector DB</span>
            </div>
            <div className="ihHealthStat">
              <span className="ihHealthValue">Good</span>
              <span className="ihHealthLabel">Embedding quality</span>
            </div>
          </div>
          <div className="ihHealthBarWrap">
            <div className="ihHealthBar" style={{ width: "94%" }} />
          </div>
          <p className="ihHealthStatus">Last indexed: 5 min ago</p>
        </section>
      </div>
    </AppShell>
  );
}
