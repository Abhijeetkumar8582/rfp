"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { rfpQuestions as rfpQuestionsApi, activity as activityApi, search as searchApi, projects as projectsApi, rephrase as rephraseApi } from "../../lib/api";
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

const docTabs = [
  { id: "all", label: "All RFPs", icon: IconDoc },
  
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

const VIEW_RFP_PAGE_SIZE = 10;

/** Modal to view a single RFP (questions/answers) — fetches by rfpid, shows table. Inline edit for one answer at a time. */
function ViewRfpModal({ rfpid, onClose }) {
  const [rfp, setRfp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [rephraseError, setRephraseError] = useState(null);
  const [viewRfpPage, setViewRfpPage] = useState(1);

  useEffect(() => {
    if (!rfpid) {
      setRfp(null);
      setLoading(false);
      setEditingIndex(null);
      setViewRfpPage(1);
      return;
    }
    setLoading(true);
    setError(null);
    setEditingIndex(null);
    setViewRfpPage(1);
    rfpQuestionsApi.get(rfpid)
      .then((data) => {
        setRfp(data);
        setError(null);
      })
      .catch((err) => setError(err?.message || "Failed to load RFP"))
      .finally(() => setLoading(false));
  }, [rfpid]);

  const startEdit = (i, currentAnswer) => {
    setEditingIndex(i);
    setEditDraft(currentAnswer ?? "");
    setSaveError(null);
    setRephraseError(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setSaveError(null);
    setRephraseError(null);
  };

  const handleRephrase = async () => {
    const text = (editDraft || "").trim();
    if (!text || editingIndex == null) return;
    const question = (questions[editingIndex] ?? "").trim() || "Question";
    setRephraseError(null);
    setRephrasing(true);
    try {
      const res = await rephraseApi.rephrase(question, text);
      setEditDraft(res.rephrased_answer ?? text);
    } catch (err) {
      setRephraseError(err?.message || "Rephrase failed");
    } finally {
      setRephrasing(false);
    }
  };

  const saveEdit = async () => {
    if (rfp == null || editingIndex == null) return;
    const questions = Array.isArray(rfp.questions) ? rfp.questions : [];
    const answers = Array.isArray(rfp.answers) ? rfp.answers : [];
    const newAnswers = questions.map((_, idx) =>
      idx === editingIndex ? editDraft : (answers[idx] ?? "")
    );
    setSaving(true);
    setSaveError(null);
    try {
      await rfpQuestionsApi.updateAnswers(rfpid, newAnswers);
      setRfp({ ...rfp, answers: newAnswers });
      setEditingIndex(null);
    } catch (err) {
      setSaveError(err?.message || "Failed to save answer");
    } finally {
      setSaving(false);
    }
  };

  if (!rfpid) return null;
  const recipients = (rfp && Array.isArray(rfp.recipients) ? rfp.recipients : []);
  const questions = (rfp && Array.isArray(rfp.questions) ? rfp.questions : []);
  const answers = (rfp && Array.isArray(rfp.answers) ? rfp.answers : []);
  const totalViewRfpPages = Math.max(1, Math.ceil(questions.length / VIEW_RFP_PAGE_SIZE));
  const viewRfpStart = (viewRfpPage - 1) * VIEW_RFP_PAGE_SIZE;
  const viewRfpEnd = Math.min(viewRfpStart + VIEW_RFP_PAGE_SIZE, questions.length);
  const rowIndices = [];
  for (let i = viewRfpStart; i < viewRfpEnd; i++) rowIndices.push(i);

  return (
    <div className="uploadModalOverlay" role="dialog" aria-modal="true" aria-label="RFP details">
      <div className="uploadModalBackdrop" onClick={onClose} aria-hidden="true" />
      <div className="uploadModalPanel questionsModalPanel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960 }}>
        <div className="uploadModalHeader questionsModalHeader">
          <h2>{rfp?.name ?? "RFP"}</h2>
          <button type="button" className="uploadModalClose" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="uploadModalBody questionsModalBody" style={{ padding: "16px 24px" }}>
          {loading && <div className="docEmptyState">Loading…</div>}
          {error && <div className="uploadModalError" style={{ marginBottom: 12 }}>{error}</div>}
          {!loading && rfp && (
            <>
              <dl style={{ margin: "0 0 16px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 14 }}>
                <dt style={{ color: "#666" }}>Created</dt>
                <dd style={{ margin: 0 }}>{formatDate(rfp.created_at)}</dd>
                <dt style={{ color: "#666" }}>Last activity</dt>
                <dd style={{ margin: 0 }}>{formatDate(rfp.last_activity_at)}</dd>
                <dt style={{ color: "#666" }}>Status</dt>
                <dd style={{ margin: 0 }}><span className={statusPillClass(rfp.status)}>{rfp.status}</span></dd>
                {recipients.length > 0 && (<><dt style={{ color: "#666" }}>Recipients</dt><dd style={{ margin: 0 }}>{recipients.join(", ")}</dd></>)}
              </dl>
              {questions.length > 0 ? (
                <div className="questionsTableWrap" style={{ marginTop: 16 }}>
                  <table className="questionsTable">
                    <thead>
                      <tr>
                        <th className="questionsThQuestion">Question</th>
                        <th className="questionsThAnswer">Answer</th>
                        <th className="questionsThActions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowIndices.map((i) => (
                        <tr key={i}>
                          <td className="questionsTdQuestion">{questions[i]}</td>
                          <td className="questionsTdAnswer">
                            {editingIndex === i ? (
                              <div className="viewRfpEditAnswerWrap">
                                <textarea
                                  className="viewRfpEditAnswerInput"
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  placeholder="Enter answer…"
                                  rows={4}
                                  autoFocus
                                />
                                {saveError && <div className="uploadModalError" style={{ marginTop: 8, marginBottom: 8 }}>{saveError}</div>}
                                {rephraseError && <div className="uploadModalError" style={{ marginTop: 8, marginBottom: 8 }}>{rephraseError}</div>}
                                <div className="viewRfpEditAnswerActions">
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button type="button" className="ghostBtn" onClick={cancelEdit} disabled={saving}>Cancel</button>
                                    <button type="button" className="primaryBtn primaryBtnPurple" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                                  </div>
                                  <div className="viewRfpRephraseWrap" title="Rephrase text">
                                    <button
                                      type="button"
                                      className="viewRfpRephraseBtn"
                                      title="Rephrase text"
                                      onClick={handleRephrase}
                                      disabled={saving || rephrasing || !(editDraft || "").trim()}
                                      aria-label="Rephrase text"
                                    >
                                      {rephrasing ? (
                                        <span className="viewRfpRephraseSpinner" aria-hidden>⟳</span>
                                      ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              answers[i] ?? "—"
                            )}
                          </td>
                          <td className="questionsTdActions">
                            {editingIndex === i ? null : (
                              <button type="button" className="docViewLink" onClick={() => startEdit(i, answers[i])}>Edit</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {questions.length > VIEW_RFP_PAGE_SIZE && (
                    <div className="questionsPagination" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="ghostBtn questionsPageBtn"
                        disabled={viewRfpPage <= 1}
                        onClick={() => setViewRfpPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="questionsPageInfo">
                        Page {viewRfpPage} of {totalViewRfpPages} ({questions.length} questions)
                      </span>
                      <button
                        type="button"
                        className="ghostBtn questionsPageBtn"
                        disabled={viewRfpPage >= totalViewRfpPages}
                        onClick={() => setViewRfpPage((p) => Math.min(totalViewRfpPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="docEmptyState" style={{ marginTop: 16 }}>No questions in this RFP.</div>
              )}
              <div className="uploadModalActions" style={{ marginTop: 20 }}>
                <button type="button" className="ghostBtn" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const [bulkProjects, setBulkProjects] = useState([]);
  const [bulkProjectId, setBulkProjectId] = useState(null);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatingIndex, setGeneratingIndex] = useState(0);

  // My RFPs table: view single RFP modal, 3-dot menu open state (rfpid)
  const [rfpViewRfpid, setRfpViewRfpid] = useState(null);
  const [openKebabRfpid, setOpenKebabRfpid] = useState(null);
  const kebabRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setOpenKebabRfpid(null);
    }
    if (openKebabRfpid != null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openKebabRfpid]);

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
    setGenerateError("");
    setGeneratingAnswers(false);
  }

  useEffect(() => {
    if (showQuestionsModal && bulkProjects.length === 0) {
      projectsApi.list().then((list) => {
        setBulkProjects(list ?? []);
        if (list?.length && bulkProjectId == null) setBulkProjectId(list[0].id);
      }).catch(() => setBulkProjects([]));
    }
  }, [showQuestionsModal]);

  async function handleGenerateAnswers() {
    const projectId = bulkProjectId ?? bulkProjects[0]?.id;
    if (projectId == null) {
      setGenerateError("Select a project to search. Add projects and documents in File Repository first.");
      return;
    }
    if (bulkQuestions.length === 0) {
      setGenerateError("No questions to generate answers for.");
      return;
    }
    setGenerateError("");
    setGeneratingAnswers(true);
    const answers = [];
    for (let i = 0; i < bulkQuestions.length; i++) {
      setGeneratingIndex(i + 1);
      const row = bulkQuestions[i];
      const q = (row.question || "").trim();
      if (!q) {
        answers.push(row.answer ?? "");
        continue;
      }
      try {
        const res = await searchApi.answer(q, projectId, 10);
        const answer = res?.answer ?? "";
        answers.push(answer);
        setBulkQuestions((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, answer } : item
          )
        );
      } catch (err) {
        const msg = err?.message || "Search failed.";
        answers.push(`[Error: ${msg}]`);
        setBulkQuestions((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, answer: `[Error: ${msg}]` } : item
          )
        );
      }
    }
    if (currentRfpid && answers.length > 0) {
      try {
        await rfpQuestionsApi.updateAnswers(currentRfpid, answers);
      } catch (err) {
        setGenerateError(err?.message || "Failed to save answers to the server.");
      }
    }
    setGeneratingAnswers(false);
    setGeneratingIndex(0);
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
                    <button type="button" className="docViewLink" onClick={() => setRfpViewRfpid(doc.rfpid)}>View</button>
                    <div className="docKebabWrap" ref={openKebabRfpid === doc.rfpid ? kebabRef : null} style={{ position: "relative", display: "inline-block" }}>
                      <button
                        type="button"
                        className="kebab docKebab"
                        aria-label="More actions"
                        aria-expanded={openKebabRfpid === doc.rfpid}
                        onClick={(e) => { e.stopPropagation(); setOpenKebabRfpid((prev) => (prev === doc.rfpid ? null : doc.rfpid)); }}
                      >
                        ⋯
                      </button>
                      {openKebabRfpid === doc.rfpid && (
                        <div className="docKebabDropdown" role="menu">
                          <button
                            type="button"
                            className="docKebabItem docKebabItemDanger"
                            role="menuitem"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
                              try {
                                await rfpQuestionsApi.delete(doc.rfpid);
                                setOpenKebabRfpid(null);
                                if (rfpViewRfpid === doc.rfpid) setRfpViewRfpid(null);
                                fetchRfps();
                              } catch (err) {
                                setListError(err?.message || "Delete failed");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rfpViewRfpid && (
        <ViewRfpModal rfpid={rfpViewRfpid} onClose={() => setRfpViewRfpid(null)} />
      )}

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
                {bulkProjects.length > 0 && (
                  <label className="questionsModalProjectWrap" style={{ marginRight: 12 }}>
                    <span className="questionsModalProjectLabel" style={{ marginRight: 6, fontSize: 14 }}>Project</span>
                    <select
                      className="docSelect"
                      value={bulkProjectId ?? ""}
                      onChange={(e) => setBulkProjectId(e.target.value ? Number(e.target.value) : null)}
                      disabled={generatingAnswers}
                      aria-label="Project to search"
                    >
                      {bulkProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className="primaryBtn primaryBtnPurple"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers || bulkQuestions.length === 0}
                >
                  {generatingAnswers
                    ? `Generating ${generatingIndex}/${bulkQuestions.length}…`
                    : "Generate answer"}
                </button>
                <button type="button" className="uploadModalClose" onClick={closeQuestionsModal} aria-label="Close">✕</button>
              </div>
            </div>
            <div className="questionsModalBody">
              {generateError && <div className="uploadModalError" style={{ marginBottom: 12 }}>{generateError}</div>}
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
