"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { rfpQuestions as rfpQuestionsApi, activity as activityApi } from "../../lib/api";
import "../css/dashboard.css";
import "./UploadRFP.css";

/* Tab icons (outline, 18px) */
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const IconDraft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const IconApproval = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    <polyline points="21 3 12 12 9 9" />
  </svg>
);
const IconSent = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconViewed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconSuggest = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);
const IconCompleted = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconExpired = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const docTabs = [
  { id: "all", label: "All RFPs", icon: IconDoc },
  { id: "draft", label: "Draft", icon: IconDraft },
  { id: "approval", label: "For Approval", icon: IconApproval },
  { id: "sent", label: "Sent", icon: IconSent },
  { id: "viewed", label: "Viewed", icon: IconViewed },
  { id: "suggest", label: "Suggest Edits", icon: IconSuggest },
  { id: "completed", label: "Sign Completed", icon: IconCompleted },
  { id: "expired", label: "Expired/Declined", icon: IconExpired },
];

/** Map tab id to API status filter (null = all). */
const tabToStatus = {
  all: null,
  draft: "Draft",
  approval: "For Approval",
  sent: "Sent",
  viewed: "Viewed",
  suggest: "Suggest Edits",
  completed: "Completed",
  expired: "Expired",
};

const RFP_PAGE_SIZE = 10;

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const statusPillClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "draft") return "docPill docPillDraft";
  if (s === "completed") return "docPill docPillCompleted";
  if (s === "sent") return "docPill docPillSent";
  if (s === "expired") return "docPill docPillExpired";
  return "docPill";
};

const PAGE_SIZE = 10;

export default function UploadRFP() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [sortTag, setSortTag] = useState(true);
  const [listView, setListView] = useState(true);

  const [docs, setDocs] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [rfpPage, setRfpPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const fetchRfps = React.useCallback(async (override = {}) => {
    if (!user?.id) {
      setDocs([]);
      setTotalDocs(0);
      return;
    }
    const page = override.page ?? rfpPage;
    setLoading(true);
    setListError("");
    try {
      const skip = (page - 1) * RFP_PAGE_SIZE;
      const status = tabToStatus[activeTab] ?? null;
      const res = await rfpQuestionsApi.list({
        skip,
        limit: RFP_PAGE_SIZE,
        user_id: user.id,
        status: status ?? undefined,
      });
      setDocs(res.items ?? []);
      setTotalDocs(res.total ?? 0);
      if (override.page != null) setRfpPage(override.page);
    } catch (err) {
      setListError(err?.message || "Failed to load RFPs.");
      setDocs([]);
      setTotalDocs(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id, rfpPage, activeTab]);

  useEffect(() => {
    fetchRfps();
  }, [fetchRfps]);

  useEffect(() => {
    activityApi.create({
      actor: user?.name || user?.email || "User",
      event_action: "Page viewed",
      target_resource: "My RFPs",
      severity: "info",
      system: "web",
    }).catch(() => {});
  }, [user?.name, user?.email]);

  const [showUploadBulkModal, setShowUploadBulkModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState([]);
  const [currentRfpid, setCurrentRfpid] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [questionsPage, setQuestionsPage] = useState(1);
  const bulkFileInputRef = useRef(null);

  function openUploadBulk() {
    setUploadError("");
    setSelectedFile(null);
    setShowUploadBulkModal(true);
  }

  function onBulkFileChange(e) {
    const file = e.target.files?.[0];
    setUploadError("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setUploadError("Please upload an Excel file (.xlsx, .xls) or CSV.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    e.target.value = "";
  }

  function onBulkDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    setUploadError("");
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setUploadError("Please upload an Excel file (.xlsx, .xls) or CSV.");
      return;
    }
    setSelectedFile(file);
  }

  function onBulkDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function parseExcelFirstColumn(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const questions = [];
          for (let i = 0; i < rows.length; i++) {
            const cell = rows[i][0];
            const text = cell != null ? String(cell).trim() : "";
            if (text) questions.push({ id: i + 1, question: text, answer: "" });
          }
          resolve(questions);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleBulkSave() {
    if (!selectedFile) {
      setUploadError("Please select an Excel or CSV file first.");
      return;
    }
    if (!user?.id) {
      setUploadError("Please sign in to upload questions.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const result = await rfpQuestionsApi.importQuestions(user.id, selectedFile);
      const questions = await parseExcelFirstColumn(selectedFile);
      if (questions.length === 0) {
        setUploadError("No questions found in the first column.");
        setUploading(false);
        return;
      }
      setCurrentRfpid(result.rfpid);
      setBulkQuestions(questions);
      setQuestionsPage(1);
      setShowUploadBulkModal(false);
      setShowQuestionsModal(true);
      fetchRfps({ page: 1 });
      try {
        await activityApi.create({
          actor: user?.name || user?.email || "User",
          event_action: "RFP questions imported",
          target_resource: selectedFile?.name ? `File: ${selectedFile.name}` : "RFP questions",
          severity: "info",
          system: "web",
        });
      } catch {
        /* non-blocking */
      }
    } catch (err) {
      setUploadError(err?.message || "Failed to upload questions.");
    } finally {
      setUploading(false);
    }
  }

  function closeUploadBulkModal() {
    setShowUploadBulkModal(false);
    setSelectedFile(null);
    setUploadError("");
  }

  function closeQuestionsModal() {
    setShowQuestionsModal(false);
    setBulkQuestions([]);
    setCurrentRfpid(null);
    setQuestionsPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(bulkQuestions.length / PAGE_SIZE));
  const startIdx = (questionsPage - 1) * PAGE_SIZE;
  const paginatedQuestions = bulkQuestions.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <>
      <header className="docPageHeader">
        <h1 className="pageTitle">My RFPs</h1>
        <div className="docHeaderActions">
          <button type="button" className="ghostBtn docExportBtn" onClick={openUploadBulk}>
            Upload Bulk Question
          </button>
        </div>
      </header>
      <p className="docPageHint" style={{ marginBottom: 16, color: "#666", fontSize: 14 }}>
        To add documents for chunking and semantic search, use{" "}
        <Link href="/filerepo" style={{ color: "var(--primaryPurple, #6366f1)", fontWeight: 500 }}>File Repository</Link>.
      </p>

      <nav className="docTabs">
        {docTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`docTab ${activeTab === id ? "docTabActive" : ""}`}
            onClick={() => { setActiveTab(id); setRfpPage(1); }}
          >
            <span className="docTabIcon"><Icon /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="docToolbar">
        <div className="docToolbarLeft">
          {sortTag && (
            <span className="docSortTag">
              Sort By: Last Updated Des <button type="button" className="docSortTagRemove" onClick={() => setSortTag(false)} aria-label="Remove">×</button>
            </span>
          )}
          <select className="docSelect" aria-label="Name">
            <option>Name</option>
          </select>
          <select className="docSelect" aria-label="Date">
            <option>Date</option>
          </select>
          <button type="button" className="ghostBtn docMoreFilters">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
            More Filters
          </button>
        </div>
        <div className="docToolbarRight">
          <div className="searchWrap docSearch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input className="searchInput" placeholder="Search..." />
          </div>
          <button type="button" className="ghostBtn">Manage Folders</button>
          <div className="docViewToggle">
            <button type="button" className={`docViewBtn ${!listView ? "docViewBtnActive" : ""}`} onClick={() => setListView(false)} aria-label="Grid view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </button>
            <button type="button" className={`docViewBtn ${listView ? "docViewBtnActive" : ""}`} onClick={() => setListView(true)} aria-label="List view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
        </div>
      </div>

      {listError && (
        <div className="docListError" role="alert">{listError}</div>
      )}
      <div className="docTableWrap">
        <table className="docTable">
          <thead>
            <tr>
              <th className="docThCheck" />
              <th className="docThName">Name</th>
              <th className="docThActivity">Last Activity</th>
              <th className="docThRecipients">Recipients</th>
              <th className="docThStatus">Status</th>
              <th className="docThActions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="docEmptyState">
                  Loading RFPs…
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={6} className="docEmptyState">
                  No RFPs found. Upload a bulk question to get started.
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr key={doc.id}>
                  <td className="docTdCheck">
                    <input type="checkbox" className="docCheckbox" aria-label={`Select ${doc.name}`} />
                  </td>
                  <td className="docTdName">
                    <span className="docCellIcon">
                      <IconDoc />
                    </span>
                    <div className="docCellNameBlock">
                      <span className="docCellTitle">{doc.name}</span>
                      <span className="docCellMeta">Created: {formatDate(doc.created_at)}</span>
                    </div>
                  </td>
                  <td className="docTdActivity">{formatDate(doc.last_activity_at)}</td>
                  <td className="docTdRecipients">
                    <div className="docAvatars">
                      {(Array.isArray(doc.recipients) ? doc.recipients : []).map((r, i) => (
                        <span key={i} className="docAvatar" title={r}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="docTdStatus">
                    <span className={statusPillClass(doc.status)}>{doc.status}</span>
                  </td>
                  <td className="docTdActions">
                    <button type="button" className="docViewLink">View</button>
                    <button type="button" className="kebab docKebab" aria-label="More actions">⋯</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && totalDocs > 0 && (
        <div className="questionsPagination" style={{ marginTop: 16, justifyContent: "center", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="ghostBtn questionsPageBtn"
            disabled={rfpPage <= 1}
            onClick={() => setRfpPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="questionsPageInfo">
            Page {rfpPage} of {Math.max(1, Math.ceil(totalDocs / RFP_PAGE_SIZE))} ({totalDocs} RFP{totalDocs !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="ghostBtn questionsPageBtn"
            disabled={rfpPage >= Math.ceil(totalDocs / RFP_PAGE_SIZE)}
            onClick={() => setRfpPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Upload Bulk Question modal */}
      {showUploadBulkModal && (
        <div className="uploadModalOverlay" role="dialog" aria-modal="true" aria-label="Upload bulk questions">
          <div className="uploadModalBackdrop" onClick={closeUploadBulkModal} aria-hidden="true" />
          <div className="uploadModalPanel" onClick={(e) => e.stopPropagation()}>
            <div className="uploadModalHeader">
              <h2>Upload Bulk Question</h2>
              <button type="button" className="uploadModalClose" onClick={closeUploadBulkModal} aria-label="Close">✕</button>
            </div>
            <div className="uploadModalBody">
              <p className="uploadModalHint">Upload an Excel (.xlsx, .xls) or CSV file with questions in column A.</p>
              {uploadError && <div className="uploadModalError">{uploadError}</div>}
              <div
                className="uploadModalDropzone"
                onDrop={onBulkDrop}
                onDragOver={onBulkDragOver}
                onClick={() => bulkFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="uploadModalDropIcon">📄</div>
                <div className="uploadModalDropText">
                  {selectedFile ? selectedFile.name : "Drop your Excel or CSV file here or click to browse"}
                </div>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onBulkFileChange}
                  style={{ display: "none" }}
                />
              </div>
              <div className="uploadModalActions">
                <button type="button" className="ghostBtn" onClick={closeUploadBulkModal} disabled={uploading}>Cancel</button>
                <button type="button" className="primaryBtn primaryBtnPurple" onClick={handleBulkSave} disabled={uploading}>
                  {uploading ? "Uploading…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions table modal (after Save) */}
      {showQuestionsModal && (
        <div className="uploadModalOverlay questionsModalOverlay" role="dialog" aria-modal="true" aria-label="Bulk questions">
          <div className="uploadModalBackdrop" onClick={closeQuestionsModal} aria-hidden="true" />
          <div className="uploadModalPanel questionsModalPanel" onClick={(e) => e.stopPropagation()}>
            <div className="uploadModalHeader questionsModalHeader">
              <h2>Bulk Questions</h2>
              <div className="questionsModalHeaderRight">
                <button type="button" className="primaryBtn primaryBtnPurple" onClick={() => { /* Generate answer – for now no-op */ }}>
                  Generate answer
                </button>
                <button type="button" className="uploadModalClose" onClick={closeQuestionsModal} aria-label="Close">✕</button>
              </div>
            </div>
            <div className="questionsModalBody">
              <div className="questionsTableWrap">
                <table className="questionsTable">
                  <thead>
                    <tr>
                      <th className="questionsThQuestion">Question</th>
                      <th className="questionsThAnswer">Answer</th>
                      <th className="questionsThActions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuestions.map((row) => (
                      <tr key={row.id}>
                        <td className="questionsTdQuestion">{row.question}</td>
                        <td className="questionsTdAnswer">{row.answer || "—"}</td>
                        <td className="questionsTdActions">
                          <button type="button" className="questionsKebab" aria-label="More actions">⋯</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="questionsPagination">
                <button
                  type="button"
                  className="ghostBtn questionsPageBtn"
                  disabled={questionsPage <= 1}
                  onClick={() => setQuestionsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="questionsPageInfo">
                  Page {questionsPage} of {totalPages} ({bulkQuestions.length} questions)
                </span>
                <button
                  type="button"
                  className="ghostBtn questionsPageBtn"
                  disabled={questionsPage >= totalPages}
                  onClick={() => setQuestionsPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
