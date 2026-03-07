"use client";

import AppShell from "../../components/AppShell";

export default function ConversationLogPage() {
  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Conversation Log</h1>
          <div className="pageSub">Browse conversation and chat history</div>
        </div>
      </header>
      <section className="panel" style={{ maxWidth: 800 }}>
        <div className="panelTitle">Conversation Log</div>
        <div className="panelSub">View and search past conversations.</div>
        <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 14 }}>
          Conversation log — coming soon.
        </p>
      </section>
    </AppShell>
  );
}
