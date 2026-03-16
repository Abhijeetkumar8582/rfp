import AppShell from "../components/AppShell";
import SearchSection from "./search";

export const metadata = {
  title: "My RFP Search | Kiza",
  description: "Search across your RFP documents with AI-powered assistance and reasoning.",
};

export default function MyRfpSearchPage() {
  return (
    <AppShell>
      <SearchSection />
    </AppShell>
  );
}
