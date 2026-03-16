import AppShell from "../components/AppShell";
import ActivityLog from "./logs";

export const metadata = {
  title: "Activity Logs | Kiza",
  description: "View governance and security activity logs across your Kiza workspace.",
};

export default function ActivityLogsPage() {
  return (
    <AppShell>
      <div className="mainLogsWrap">
        <ActivityLog />
      </div>
    </AppShell>
  );
}
