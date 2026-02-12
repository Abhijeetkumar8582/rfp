"use client";

import AppShell from "../components/AppShell";
import ActivityLog from "./logs";

export default function ActivityLogPage() {
  return (
    <AppShell>
      <div className="mainLogsWrap">
        <ActivityLog />
      </div>
    </AppShell>
  );
}
