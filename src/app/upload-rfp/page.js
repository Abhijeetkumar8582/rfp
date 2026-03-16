import AppShell from "../components/AppShell";
import UploadRFP from "./UploadRFP";

export const metadata = {
  title: "My RFPs | Kiza",
  description: "Upload and manage your RFP documents with Kiza.",
};

export default function UploadRFPPage() {
  return (
    <AppShell>
      <UploadRFP />
    </AppShell>
  );
}
