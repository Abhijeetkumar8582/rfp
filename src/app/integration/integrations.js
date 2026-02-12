"use client";

import React, { useState } from "react";
import "../css/integrations.css";

// Seed: 3rd party apps (in production from API)
const INTEGRATIONS = [
  {
    id: "slack",
    name: "Slack",
    description: "Get RFP notifications and share responses in channels. Sync comments and deadlines.",
    icon: "💬",
    category: "Communication",
    connected: true,
    configUrl: "#",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Post updates to Teams channels and link RFP items to conversations.",
    icon: "👥",
    category: "Communication",
    connected: false,
    configUrl: "#",
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description: "Import and sync documents from Drive. Attach Drive files to RFP responses.",
    icon: "📁",
    category: "Storage",
    connected: true,
    configUrl: "#",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Connect OneDrive for Business to pull in proposals and supporting documents.",
    icon: "☁️",
    category: "Storage",
    connected: false,
    configUrl: "#",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Link opportunities to RFPs. Push status and key dates into Salesforce.",
    icon: "📊",
    category: "CRM",
    connected: false,
    configUrl: "#",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Create Jira tickets from RFP tasks. Sync due dates and assignees.",
    icon: "📋",
    category: "Project",
    connected: false,
    configUrl: "#",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Import document libraries and sync folder structure with File Repository.",
    icon: "📂",
    category: "Storage",
    connected: false,
    configUrl: "#",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Export RFP summaries and response templates to Notion workspaces.",
    icon: "📝",
    category: "Docs",
    connected: false,
    configUrl: "#",
  },
];

export default function Integrations() {
  const [filter, setFilter] = useState("all"); // all | connected | available
  const [connectingId, setConnectingId] = useState(null);

  const filtered = INTEGRATIONS.filter((app) => {
    if (filter === "connected") return app.connected;
    if (filter === "available") return !app.connected;
    return true;
  });

  const handleConnect = (id) => {
    setConnectingId(id);
    // Simulate OAuth/API call
    setTimeout(() => {
      setConnectingId(null);
      // In real app: update state from API response
    }, 1500);
  };

  return (
    <div className="intPage">
      <header className="intHeader">
        <h1 className="intTitle">Integrations</h1>
        <p className="intSubtitle">
          Connect RFP with Slack, Teams, Google Drive, Salesforce, and more. Sync documents, notifications, and deadlines.
        </p>
        <div className="intFilters">
          <button
            type="button"
            className={`intFilterBtn ${filter === "all" ? "intFilterBtnActive" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`intFilterBtn ${filter === "connected" ? "intFilterBtnActive" : ""}`}
            onClick={() => setFilter("connected")}
          >
            Connected
          </button>
          <button
            type="button"
            className={`intFilterBtn ${filter === "available" ? "intFilterBtnActive" : ""}`}
            onClick={() => setFilter("available")}
          >
            Available
          </button>
        </div>
      </header>

      <section className="intSection">
        <div className="intGrid">
          {filtered.map((app) => (
            <div key={app.id} className="intCard">
              <div className="intCardTop">
                <div className="intCardIcon">{app.icon}</div>
                <div className="intCardMeta">
                  <h3 className="intCardName">{app.name}</h3>
                  <span className="intCardCategory">{app.category}</span>
                </div>
                <span className={`intStatus ${app.connected ? "intStatusConnected" : "intStatusDisconnected"}`}>
                  {app.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p className="intCardDesc">{app.description}</p>
              <div className="intCardActions">
                {app.connected ? (
                  <>
                    <a href={app.configUrl} className="intBtn intBtnSecondary">
                      Configure
                    </a>
                    <button type="button" className="intBtn intBtnGhost">
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="intBtn intBtnPrimary"
                    disabled={connectingId !== null}
                    onClick={() => handleConnect(app.id)}
                  >
                    {connectingId === app.id ? "Connecting…" : "Connect"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {filtered.length === 0 && (
        <div className="intEmpty">
          <p>
            {filter === "connected"
              ? "No integrations connected yet. Connect one from the Available filter."
              : "No integrations match this filter."}
          </p>
        </div>
      )}

      <section className="intCta">
        <div className="intCtaInner">
          <span className="intCtaBadge">Request</span>
          <h2 className="intCtaTitle">Need another app?</h2>
          <p className="intCtaBody">
            We’re adding integrations based on demand. Request a 3rd party app and we’ll prioritize it.
          </p>
          <button type="button" className="intBtn intBtnPrimary intBtnCta">
            Request integration
          </button>
        </div>
      </section>
    </div>
  );
}
