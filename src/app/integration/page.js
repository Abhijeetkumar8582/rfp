

import AppShell from "../components/AppShell";
import Integrations from "./integrations";

export const metadata = {
  title: "Integrations",
  description: "Connect RFP with Slack, Teams, Google Drive, Salesforce, and more. Sync documents, notifications, and deadlines.",
};

export default function IntegrationPage() {
  return (
    <AppShell>
      <div className="integrationPageWrap">
        <Integrations />
      </div>
    </AppShell>
  );
}
