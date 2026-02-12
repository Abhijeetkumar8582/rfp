"use client";

import AppShell from "../components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">Settings</h1>
          <div className="pageSub">Manage your account and preferences</div>
        </div>
      </header>
      <section className="panel" style={{ maxWidth: 600 }}>
        <div className="panelTitle">General Settings</div>
        <div className="panelSub">Configure your RFP application preferences.</div>
        <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 14 }}>
          Settings page — coming soon.
        </p>
      </section>
    </AppShell>
  );
}
