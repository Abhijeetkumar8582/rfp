"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { useAuth } from "../../../context/AuthContext";
import "../../css/dashboard.css";

function canManageUsers(user) {
  const role = (user?.role || "").toLowerCase();
  return role === "admin" || role === "manager";
}

export default function ApiConfigurationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const canAccess = canManageUsers(user);

  useEffect(() => {
    if (loading) return;
    if (!canAccess) {
      router.replace("/team-directory");
    }
  }, [loading, canAccess, router]);

  useEffect(() => {
    document.title = "API Configuration";
  }, []);

  if (loading || !canAccess) {
    return (
      <AppShell>
        <div className="panelSub" style={{ padding: 24 }}>Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">API Configuration</h1>
          <div className="pageSub">Configure API providers and keys for the platform.</div>
        </div>
      </header>

      <section className="panel apiConfigSection">
        <p className="apiConfigHint">API Configuration is available to Super Admin and Admin only. Configure providers and credentials here.</p>
      </section>
    </AppShell>
  );
}
