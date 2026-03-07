"use client";

import AppShell from "../../components/AppShell";

export default function EndpointLogPage() {
  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Endpoint Log</h1>
          <div className="pageSub">View API endpoint request and response history</div>
        </div>
      </header>
      <section className="panel" style={{ maxWidth: 800 }}>
        <div className="panelTitle">Endpoint Log</div>
        <div className="panelSub">Inspect calls to external endpoints and their responses.</div>
        <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 14 }}>
          Endpoint log — coming soon.
        </p>
      </section>
    </AppShell>
  );
}
