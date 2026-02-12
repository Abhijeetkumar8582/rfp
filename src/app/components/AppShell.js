"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "../css/dashboard.css";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/search", label: "Search/Upload", icon: "🔍" },
  { href: "/filerepo", label: "File Repository", icon: "📂" },
  { href: "/project", label: "Intelligence Hub", icon: "🧠" },
];

const settingsNavItems = [
  { href: "/activitylog", label: "Activity Log", icon: "📋" },
  { href: "/accessintelligence", label: "Access Intelligence", icon: "🔒" },
  { href: "/integration", label: "Integrations", icon: "🔌" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppShell({ children, mainClassName = "main" }) {
  const pathname = usePathname();

  const isActive = (href) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="profile">
          <div className="avatar" />
          <div className="profileMeta">
            <div className="profileName">RFP User</div>
            <div className="profileRole">RFP Management</div>
          </div>
          <button className="chevBtn" aria-label="profile menu">
            ▾
          </button>
        </div>

        <nav className="nav">
          {mainNavItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`navItem ${isActive(href) ? "navItemActive" : ""}`}
            >
              <span className="navIcon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          <div className="navGroup">
            <div className="navGroupTitle">Settings</div>
            {settingsNavItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`navItem navItemSub ${isActive(href) ? "navItemActive" : ""}`}
              >
                <span className="navIcon">{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <Link href="/login" className="logout">
          <span className="navIcon">⎋</span>
          <span>Logout</span>
        </Link>
      </aside>

      <main className={mainClassName}>{children}</main>
    </div>
  );
}
