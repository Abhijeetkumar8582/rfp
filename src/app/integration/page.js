"use client";

import AppShell from "../components/AppShell";
import Integrations from "./integrations";

export default function IntegrationPage() {
  return (
    <AppShell>
      <div className="integrationPageWrap">
        <Integrations />
      </div>
    </AppShell>
  );
}
