"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import "../css/theme.css";
import "../css/dashboard.css";

/* Small white outline icons for sidebar (20px) */
const IconApps = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
);
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const IconFolder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);
const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);
const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);
const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const IconPlug = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5" />
    <path d="M9 8V2" />
    <path d="M15 8V2" />
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </svg>
);
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconApi = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5" />
    <path d="M9 8V2" />
    <path d="M15 8V2" />
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </svg>
);
const IconEndpointLog = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const IconConversation = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconMenuCollapse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: IconApps },
  { href: "/search", label: "Search/Upload", icon: IconSearch },
  { href: "/upload-rfp", label: "My RFPs", icon: IconClipboard },
  { href: "/file-repository", label: "File Repository", icon: IconFolder },
  { href: "/intelligence-hub", label: "Intelligence Hub", icon: IconBrain },
];

const settingsNavItemsBase = [
  { href: "/activitylog", label: "Activity Log", icon: IconClipboard, adminOnly: true },
  { href: "/accessintelligence", label: "Access Intelligence", icon: IconLock, adminOnly: true },
  { href: "/integration", label: "Integrations", icon: IconPlug, adminOnly: true },
];

const settingsDropdownItemsBase = [
  { href: "/team-directory", label: "Team Directory", icon: IconUser, adminOnly: true },
  { href: "/settings/api", label: "API Configuration", icon: IconApi, adminOnly: true },
  { href: "/settings/endpoint-log", label: "Endpoint Log", icon: IconEndpointLog, adminOnly: true },
  { href: "/settings/conversation-log", label: "Conversation Log", icon: IconConversation, adminOnly: true },
];

const ADMIN_ONLY_PATHS = ["/activitylog", "/accessintelligence", "/settings", "/settings/endpoint-log", "/settings/conversation-log", "/settings/api", "/integration", "/team-directory"];

const PROTECTED_PATHS = ["/dashboard", "/file-repository", "/search", "/upload-rfp", "/intelligence-hub", "/activitylog", "/accessintelligence", "/integration", "/settings", "/team-directory"];

function canManageUsers(user) {
  const role = (user?.role || "").toLowerCase();
  return role === "admin" || role === "manager";
}

function isViewer(user) {
  const role = (user?.role || "").toLowerCase();
  return role === "viewer";
}

export default function AppShell({ children, mainClassName = "main" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const settingsRef = useRef(null);

  const settingsNavItems = settingsNavItemsBase.filter(
    (item) => !item.adminOnly || canManageUsers(user)
  );
  const settingsDropdownItems = settingsDropdownItemsBase.filter(
    (item) => !item.adminOnly || canManageUsers(user)
  );

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));
  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));
  const isViewerOnDashboard = user && isViewer(user) && (pathname === "/dashboard" || pathname?.startsWith("/dashboard/"));
  const shouldRedirectToLogin = !loading && !user && isProtected;
  const shouldRedirectToDashboard = !loading && user && isAdminOnlyPath && !canManageUsers(user);
  const shouldRedirectViewerFromDashboard = !loading && isViewerOnDashboard;
  const shouldRedirect = shouldRedirectToLogin || shouldRedirectToDashboard || shouldRedirectViewerFromDashboard;

  const mainNavItemsFiltered = mainNavItems.filter((item) => !(item.href === "/dashboard" && isViewer(user)));

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace("/login");
    } else if (shouldRedirectToDashboard) {
      router.replace("/dashboard");
    } else if (shouldRedirectViewerFromDashboard) {
      router.replace("/search");
    }
  }, [shouldRedirectToLogin, shouldRedirectToDashboard, shouldRedirectViewerFromDashboard, router]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [settingsOpen]);

  if (shouldRedirectToLogin || shouldRedirectToDashboard || shouldRedirectViewerFromDashboard) {
    return null;
  }

  async function handleLogout(e) {
    e.preventDefault();
    await logout();
    router.push("/login");
  }

  const isActive = (href) => {
    if (pathname === href) return true;
    if (href === "/dashboard") return false;
    if (href === "/settings") return pathname === "/settings";
    return pathname?.startsWith(href);
  };

  return (
    <div className={`appShell ${sidebarCollapsed ? "appShellCollapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "sidebarCollapsed" : ""}`}>
        <div className="sidebarHeader">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="collapseBtn"
            title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <IconMenuCollapse />
          </button>
          <div className={`profileText ${sidebarCollapsed ? "profileTextHidden" : ""}`}>
            <div className="profileName">{user?.name || user?.email || "RFP"}</div>
          </div>
        </div>

        <nav className="nav">
          {mainNavItemsFiltered.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`navItem ${isActive(href) ? "navItemActive" : ""}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <span className="navIcon"><Icon /></span>
              <span className="navLabel">{label}</span>
            </Link>
          ))}

          {canManageUsers(user) && (
            <div className={`navGroup ${sidebarCollapsed ? "navGroupCollapsed" : ""}`}>
              <div className="navGroupTitle">Settings</div>
              {settingsNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`navItem navItemSub ${isActive(href) ? "navItemActive" : ""}`}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="navIcon"><Icon /></span>
                  <span className="navLabel">{label}</span>
                </Link>
              ))}
              <div className={`settingsDropdownWrap ${sidebarCollapsed ? "settingsDropdownWrapCollapsed" : ""}`} ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className={`navItem settingsDropdownBtn ${settingsOpen ? "navItemActive" : ""}`}
                  aria-expanded={settingsOpen}
                  aria-haspopup="true"
                  title={sidebarCollapsed ? "Settings" : undefined}
                >
                  <span className="navIcon"><IconSettings /></span>
                  <span className="navLabel">Settings</span>
                  <span className={`navCaret ${settingsOpen ? "navCaretOpen" : ""} ${sidebarCollapsed ? "navCaretHidden" : ""}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {settingsOpen && (
                  <div className="settingsDropdown">
                    {settingsDropdownItems.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setSettingsOpen(false)}
                        className={`navItem navItemSub ${isActive(href) ? "navItemActive" : ""}`}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        <span className="navIcon"><Icon /></span>
                        <span className="navLabel">{label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        <button type="button" onClick={handleLogout} className="logout" style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: "inherit", font: "inherit", color: "inherit" }} title={sidebarCollapsed ? "Logout" : undefined}>
          <span className="navIcon"><IconLogout /></span>
          <span className="navLabel">Logout</span>
        </button>
      </aside>

      <main className={mainClassName}>{children}</main>
    </div>
  );
}
