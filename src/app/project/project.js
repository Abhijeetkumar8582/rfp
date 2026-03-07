"use client";

import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, intelligenceHub as intelligenceHubApi, projects as projectsApi } from "../../lib/api";
import "../css/project.css";

export default function IntelligenceHub() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "Intelligence Hub",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list || []);
      if (list?.length > 0 && selectedProjectId == null) {
        setSelectedProjectId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    intelligenceHubApi.get(selectedProjectId || undefined)
      .then((res) => setData(res || {}))
      .catch((err) => {
        setError(err.message || "Failed to load Intelligence Hub data");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const recentlyUploaded = data?.recently_uploaded ?? [];
  const mostSearched = data?.most_searched_topics ?? [];
  const gapsInKnowledge = data?.gaps_in_knowledge ?? [];
  const lowConfidenceAreas = data?.low_confidence_areas ?? [];
  const highConfidenceAreas = data?.high_confidence_areas ?? [];

  return (
    <AppShell mainClassName="pmMain">
      {/* Header */}
      <div className="ihHeader">
        <div className="ihHeaderContent">
          <h1 className="ihTitle">Intelligence Hub</h1>
          <p className="ihSubtitle">
            AI-powered insights from your RFP knowledge base
          </p>
          {projects.length > 1 && (
            <div className="ihProjectSelect">
              <label htmlFor="ih-project">Project:</label>
              <select
                id="ih-project"
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="ihProjectSelectOpt"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="topSearch ihSearch">
          <span className="searchIcon">🔎</span>
          <input placeholder="Search across knowledge base..." />
        </div>
      </div>

      {error && (
        <div className="ihError">
          {error}
        </div>
      )}

      {loading ? (
        <div className="ihLoading">Loading Intelligence Hub data…</div>
      ) : (
      /* Sections grid */
      <div className="ihGrid">
        {/* Recently Uploaded Docs */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">📄</span>
            <h2 className="ihCardTitle">Recently Uploaded Docs</h2>
          </div>
          <ul className="ihDocList">
            {recentlyUploaded.length > 0 ? (
              recentlyUploaded.map((doc, i) => (
                <li key={doc.id ?? `${doc.name}-${i}`} className="ihDocItem">
                  <div className="ihDocInfo">
                    <span className="ihDocName">{doc.name}</span>
                    <span className="ihDocMeta">{doc.time} · {doc.size}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="ihDocItem ihEmpty">No documents uploaded yet</li>
            )}
          </ul>
          <a href="/filerepo" className="ihCardLink">View all →</a>
        </section>

        {/* Most Searched Topics */}
        <section className="ihCard">
          <div className="ihCardHeader">
            <span className="ihCardIcon">🔥</span>
            <h2 className="ihCardTitle">Most Searched Topics</h2>
          </div>
          <p className="ihCardDesc">
            Topics users search for most often
          </p>
          <ul className="ihTopicList">
            {mostSearched.length > 0 ? (
              mostSearched.map((t) => (
                <li key={t.topic} className="ihTopicItem">
                  <span className="ihTopicName">{t.topic}</span>
                  <span className="ihTopicCount">{t.count} searches</span>
                </li>
              ))
            ) : (
              <li className="ihTopicItem ihEmpty">No searches yet. Try the search page.</li>
            )}
          </ul>
        </section>

        {/* Gaps in Knowledge */}
        <section className="ihCard ihCardWarn">
          <div className="ihCardHeader">
            <span className="ihCardIcon">⚠️</span>
            <h2 className="ihCardTitle">Gaps in Knowledge</h2>
          </div>
          <p className="ihCardDesc">
            Data lacking in documents — no results, missing topic, or insufficient evidence
          </p>
          <ul className="ihGapList">
            {gapsInKnowledge.length > 0 ? (
              gapsInKnowledge.map((g) => (
                <li key={g.area} className={`ihGapItem ihGap--${g.priority}`}>
                  <span>{g.area}</span>
                  <span className="ihGapBadge">{g.priority}</span>
                </li>
              ))
            ) : (
              <li className="ihGapItem ihEmpty">No gaps identified</li>
            )}
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
            {lowConfidenceAreas.length > 0 ? (
              lowConfidenceAreas.map((c) => (
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
              ))
            ) : (
              <li className="ihConfItem ihEmpty">No low-confidence areas identified</li>
            )}
          </ul>
          <button className="ihCardBtn">Improve coverage</button>
        </section>

        {/* High Confidence Areas */}
        <section className="ihCard ihCardSuccess">
          <div className="ihCardHeader">
            <span className="ihCardIcon">✓</span>
            <h2 className="ihCardTitle">High Confidence Areas</h2>
          </div>
          <p className="ihCardDesc">
            Topics where the system answers with high confidence (≥85%)
          </p>
          <ul className="ihConfList">
            {highConfidenceAreas.length > 0 ? (
              highConfidenceAreas.map((c) => (
                <li key={c.section} className="ihConfItem">
                  <span className="ihConfSection">{c.section}</span>
                  <div className="ihConfBarWrap">
                    <div
                      className="ihConfBar ihConfBarHigh"
                      style={{ width: `${c.confidence}%` }}
                    />
                  </div>
                  <span className="ihConfPct">{c.confidence}%</span>
                </li>
              ))
            ) : (
              <li className="ihConfItem ihEmpty">No high-confidence areas yet. Run more searches with good coverage.</li>
            )}
          </ul>
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
      )}
    </AppShell>
  );
}
