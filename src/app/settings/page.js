"use client";

import { useState, useRef, useEffect } from "react";
import AppShell from "../components/AppShell";
import "../css/dashboard.css";

const initialUsers = [
  { id: 1, username: "jdoe", fullName: "Jane Doe", email: "jane.doe@acme.com", role: "Admin", active: true, phone: "" },
  { id: 2, username: "bsmith", fullName: "Bob Smith", email: "bob.smith@acme.com", role: "Editor", active: true, phone: "" },
  { id: 3, username: "ajones", fullName: "Alice Jones", email: "alice.jones@acme.com", role: "Viewer", active: false, phone: "" },
];

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

export default function SettingsPage() {
  const [users, setUsers] = useState(initialUsers);
  const [openKebabId, setOpenKebabId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const kebabRef = useRef(null);

  const closeKebab = () => setOpenKebabId(null);

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
    setUsers((prev) =>
      prev.map((u) => (u.id === editUser.id ? { ...u, ...editUser, fullName: `${editUser.firstName || ""} ${(editUser.surname || "").trim()}`.trim() } : u))
    );
    setEditUser(null);
  };

  const updateEdit = (field, value) => {
    setEditUser((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">User</h1>
          <div className="pageSub">Manage your account and preferences</div>
        </div>
        <button type="button" className="primaryBtn primaryBtnBlue">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add User
          </span>
        </button>
      </header>

      <section className="panel tablePanel">
        <div className="tableHeader">
          <div>
            <div className="tableTitle">User list</div>
            <div className="panelSub" style={{ marginTop: 4 }}>Manage users and roles</div>
          </div>
        </div>
        <div className="tableWrap">
          <table className="table userTable">
            <thead>
              <tr>
                <th>USERNAME</th>
                <th>FULL NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>ACTIVE</th>
                <th className="wEdit">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isOpen = openKebabId === u.id;
                return (
                  <tr key={u.id}>
                    <td><span className="prodName">{u.username}</span></td>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`pill ${u.active ? "pillActive" : "pillInactive"}`}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
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
        </div>
      </section>

      {editUser && (
        <div className="modalBackdrop" onClick={() => setEditUser(null)}>
          <div className="modalCard editUserModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Edit user</div>
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
                      <span className="formInputBadge" title="Verified">✓</span>
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
