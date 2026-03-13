"use client";

import { useState, useRef, useEffect } from "react";
import AppShell from "../components/AppShell";
import { users as usersApi } from "../../lib/api";
import "../css/dashboard.css";

/** Format date for display (e.g. "Feb 10, 2023"). */
function formatJoinDate(createdAt) {
  if (!createdAt) return "—";
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Get initials from full name (e.g. "Abhijeet Kumar" -> "AK"). */
function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || "?").toUpperCase();
}

/** Map backend user to table row shape. */
function mapUserFromApi(u) {
  const roleDisplay = (u.role || "viewer").charAt(0).toUpperCase() + (u.role || "").slice(1);
  return {
    id: u.id,
    username: (u.email || "").split("@")[0] || u.id,
    fullName: u.name || "—",
    email: u.email || "",
    role: roleDisplay,
    active: !!u.is_active,
    phone: u.phone ?? "",
    created_at: u.created_at,
    joinDate: formatJoinDate(u.created_at),
    recentActivity: "Active now", // Placeholder; replace with real activity when API supports it
  };
}

const TIMEZONES = [
  "(UTC+02:00) Eastern European Time (Bucharest)",
  "(UTC+00:00) Greenwich Mean Time (London)",
  "(UTC-05:00) Eastern Time (New York)",
  "(UTC+05:30) India Standard Time (Mumbai)",
];

const LANGUAGES = ["English (United States)", "English (UK)", "Spanish", "French", "German"];

function KebabMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function parseFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/);
  const firstName = parts[0] || "";
  const surname = parts.slice(1).join(" ") || "";
  return { firstName, surname };
}

const SUMMARY_COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444"]; // purple, green, gold, red

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openKebabId, setOpenKebabId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const kebabRef = useRef(null);

  const closeKebab = () => setOpenKebabId(null);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredUsers = searchLower
    ? users.filter(
        (u) =>
          (u.fullName && u.fullName.toLowerCase().includes(searchLower)) ||
          (u.email && u.email.toLowerCase().includes(searchLower)) ||
          (u.username && u.username.toLowerCase().includes(searchLower))
      )
    : users;

  const totalMembers = users.length;
  const activeSeats = users.filter((u) => u.active).length;
  const pendingInvites = 0;
  const deactivated = users.filter((u) => !u.active).length;

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await usersApi.list({ limit: 500 });
      setUsers(list.map(mapUserFromApi));
    } catch (e) {
      setError(e?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (openKebabId == null) return;
    function handleClickOutside(e) {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) closeKebab();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openKebabId]);

  const handleEdit = (u) => {
    setOpenKebabId(null);
    const { firstName, surname } = parseFullName(u.fullName);
    setEditUser({
      ...u,
      firstName: u.firstName ?? firstName,
      surname: u.surname ?? surname,
      timezone: u.timezone ?? TIMEZONES[0],
      language: u.language ?? LANGUAGES[0],
    });
  };

  const handleSave = () => {
    if (!editUser) return;
    const fullName = `${editUser.firstName || ""} ${(editUser.surname || "").trim()}`.trim();
    if (editUser.id == null) {
      const newId = `new-${Date.now()}`;
      setUsers((prev) => [
        ...prev,
        {
          id: newId,
          username: editUser.username || "",
          fullName: fullName || "—",
          email: editUser.email || "",
          role: editUser.role || "Viewer",
          active: editUser.active !== false,
          phone: editUser.phone || "",
          joinDate: formatJoinDate(new Date()),
          recentActivity: "Active now",
        },
      ]);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, ...editUser, fullName } : u))
      );
    }
    setEditUser(null);
  };

  const updateEdit = (field, value) => {
    setEditUser((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <AppShell>
      <header className="headerRow usersPageHeader">
        <div>
          <h1 className="pageTitle">Team Directory</h1>
          <div className="pageSub">Manage team roles and system access.</div>
        </div>
        <button
          type="button"
          className="primaryBtn primaryBtnBlue inviteMemberBtn"
          onClick={() =>
            setEditUser({
              id: null,
              firstName: "",
              surname: "",
              email: "",
              phone: "",
              username: "",
              fullName: "",
              role: "Viewer",
              active: true,
              timezone: TIMEZONES[0],
              language: LANGUAGES[0],
            })
          }
        >
          <span className="inviteMemberBtnInner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Invite Member
          </span>
        </button>
      </header>

      <section className="teamSummaryBar">
        <div className="teamSummaryCard">
          <div className="teamSummaryIcon" style={{ background: "rgba(99, 102, 241, 0.12)", color: SUMMARY_COLORS[0] }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="teamSummaryLabel">Total Members:</div>
          <div className="teamSummaryValue">{loading ? "—" : totalMembers}</div>
        </div>
        <div className="teamSummaryCard">
          <div className="teamSummaryIcon" style={{ background: "rgba(34, 197, 94, 0.12)", color: SUMMARY_COLORS[1] }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 16 17 22 17 22 11" />
              <line x1="16" y1="14" x2="22" y2="14" />
            </svg>
          </div>
          <div className="teamSummaryLabel">Active Seats:</div>
          <div className="teamSummaryValue">{loading ? "—" : activeSeats}</div>
        </div>
        <div className="teamSummaryCard">
          <div className="teamSummaryIcon" style={{ background: "rgba(234, 179, 8, 0.12)", color: SUMMARY_COLORS[2] }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
              <line x1="12" y1="13" x2="12" y2="21" />
            </svg>
          </div>
          <div className="teamSummaryLabel">Pending Invites:</div>
          <div className="teamSummaryValue">{pendingInvites}</div>
        </div>
        <div className="teamSummaryCard">
          <div className="teamSummaryIcon" style={{ background: "rgba(239, 68, 68, 0.12)", color: SUMMARY_COLORS[3] }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="teamSummaryLabel">Deactivated:</div>
          <div className="teamSummaryValue">{loading ? "—" : deactivated}</div>
        </div>
      </section>

      <section className="panel tablePanel usersTablePanel">
        <div className="tableHeader teamTableHeader">
          <div className="teamTableHeaderLeft">
            <div className="tableTitle">Team members</div>
            <div className={`teamSearchWrap${searchQuery ? " hasValue" : ""}`}>
              <span className="teamSearchIcon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                type="search"
                className="teamSearchInput"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search users"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="teamSearchClear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="tableWrap">
          {error && (
            <div className="panelSub" style={{ padding: 12, color: "var(--colorError, #c00)" }}>
              {error}
            </div>
          )}
          {loading ? (
            <div className="panelSub" style={{ padding: 24 }}>Loading team members…</div>
          ) : (
          <>
          {searchQuery && (
            <div className="teamSearchResultsHint">
              {filteredUsers.length === 0
                ? "No members match your search."
                : `${filteredUsers.length} member${filteredUsers.length !== 1 ? "s" : ""} found`}
            </div>
          )}
          <table className="table userTable teamDirectoryTable">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>WORK EMAIL</th>
                <th>ACCESS LEVEL</th>
                <th>STATUS</th>
                <th>RECENT ACTIVITY</th>
                <th>JOIN DATE</th>
                <th className="wEdit"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isOpen = openKebabId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="teamMemberCell">
                        <span className="teamMemberAvatar" style={{ backgroundColor: `hsl(${(u.id.length * 37) % 360}, 55%, 45%)` }}>
                          {getInitials(u.fullName)}
                        </span>
                        <span className="teamMemberName">{u.fullName}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className="statusWithDot">
                        {u.active ? (
                          <>
                            <span className="statusDot statusDotActive" />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="statusDot statusDotInactive" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td>{u.recentActivity || "—"}</td>
                    <td>{u.joinDate}</td>
                    <td style={{ textAlign: "right", position: "relative" }}>
                      <div className="rowActionWrap" ref={isOpen ? kebabRef : null}>
                        <button
                          type="button"
                          className="kebab"
                          aria-label="Actions"
                          onClick={() => setOpenKebabId(isOpen ? null : u.id)}
                        >
                          <KebabMenu />
                        </button>
                        {isOpen && (
                          <div className="rowActionDropdown">
                            <button type="button" className="rowActionItem" onClick={() => handleEdit(u)}>
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
          )}
        </div>
      </section>

      {editUser && (
        <div className="modalBackdrop" onClick={() => setEditUser(null)}>
          <div className="modalCard editUserModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">{editUser.id == null ? "New user" : "Edit user"}</div>
            <div className="editUserForm">
              <div className="editUserRow">
                <div className="avatarPlaceholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="editUserFields">
                  <div className="formField">
                    <label className="formLabel">First Name *</label>
                    <input
                      type="text"
                      className="formInput"
                      value={editUser.firstName ?? ""}
                      onChange={(e) => updateEdit("firstName", e.target.value)}
                    />
                  </div>
                  <div className="formField">
                    <label className="formLabel">Surname *</label>
                    <input
                      type="text"
                      className="formInput"
                      value={editUser.surname ?? ""}
                      onChange={(e) => updateEdit("surname", e.target.value)}
                    />
                  </div>
                  <div className="formField formFieldFull">
                    <label className="formLabel">Email address *</label>
                    <div className="formInputWrap">
                      <input
                        type="email"
                        className="formInput"
                        value={editUser.email || ""}
                        onChange={(e) => updateEdit("email", e.target.value)}
                      />
                      {editUser.id != null && (
                        <span className="formInputBadge" title="Verified">✓</span>
                      )}
                    </div>
                  </div>
                  <div className="formField formFieldFull">
                    <label className="formLabel">Phone number</label>
                    <input
                      type="tel"
                      className="formInput"
                      value={editUser.phone ?? ""}
                      onChange={(e) => updateEdit("phone", e.target.value)}
                    />
                  </div>
                  <div className="formField formFieldFull">
                    <label className="formLabel">User name *</label>
                    <input
                      type="text"
                      className="formInput"
                      value={editUser.username || ""}
                      onChange={(e) => updateEdit("username", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="editUserRow editUserRowFull">
                <label className="formLabel">Timezone</label>
                <select
                  className="formInput formSelect"
                  value={editUser.timezone ?? TIMEZONES[0]}
                  onChange={(e) => updateEdit("timezone", e.target.value)}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="editUserRow editUserRowFull">
                <label className="formLabel">Language</label>
                <select
                  className="formInput formSelect"
                  value={editUser.language ?? LANGUAGES[0]}
                  onChange={(e) => updateEdit("language", e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modalFooter">
              <button type="button" className="ghostBtn" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="button" className="primaryBtn primaryBtnBlue" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
