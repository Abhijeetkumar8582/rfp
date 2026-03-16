

import AppShell from "../components/AppShell";
import AccessIntelligence from "./accessIntelligence";

export const metadata = {
  title: "Access Intelligence",
  description: "View who accessed which document, sensitive document access frequency, and suspicious activity alerts. Strong compliance positioning.",
};
export default function AccessIntelligencePage() {
  return (
    <AppShell>
      <div className="aiPageWrap">
        <AccessIntelligence />
      </div>
    </AppShell>
  );
}
