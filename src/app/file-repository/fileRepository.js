"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { projects as projectsApi, documents as documentsApi, activity as activityApi, dashboard as dashboardApi, accessIntelligence as accessIntelligenceApi, API_BASE, getToken } from "../../lib/api";
import { isAdminLike, normalizeRole } from "../../lib/rbac";
import "../css/filerepository.css";

/** True if current user can add files and train data (Super Admin or Admin). */
function canManageFiles(user) {
  return isAdminLike(user);
}

/** True if current user can see row actions (3-dots menu) and open file detail (chunks/meta). Admin, Super Admin, and Developer can; Viewer cannot. */
function canSeeRowActions(user) {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "manager" || role === "analyst" || role === "developer";
}

/** True if current user is Developer (analyst). They get only Open/Download in kebab; Download only for Open for all. */
function isDeveloperRole(user) {
  const role = normalizeRole(user?.role);
  return role === "analyst" || role === "developer";
}

function logPageView(activityApi, user, resource) {
  activityApi.create({
    actor: user?.name || user?.email || "User",
    event_action: "Page viewed",
    target_resource: resource,
    severity: "info",
    system: "web",
  }).catch(() => {});
}

// Semantic clusters — documents are auto-assigned to these by meaning (vector similarity). FAQs and Uncategorized are special sections.
const CLUSTERS = ["All", "Security", "Finance", "Architecture", "Compliance", "Integrations", "FAQs", "Uncategorized"];

// Document access levels: controls whether URL is shown, and open/download allowed
export const ACCESS_LEVELS = {
  open_for_all: { id: "open_for_all", label: "Open for all", desc: "Anyone can open, download, and see document URL in answers." },
  team_specific: { id: "team_specific", label: "Team specific", desc: "Only your team can open and download; others see name only in answers." },
  high_security: { id: "high_security", label: "High security", desc: "Name only for answers — no open, no download, no URL shown." },
};

function formatDateISO(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function docToFile(doc) {
  const created = formatDateISO(doc.uploaded_at);
  const modified = doc.ingested_at ? formatDateISO(doc.ingested_at) : created;
  return {
    id: String(doc.id),
    folder: doc.cluster || "Integrations",
    name: doc.filename,
    created,
    modified,
    cluster: doc.cluster || "Integrations",
    accessLevel: "open_for_all",
    documentId: doc.id,
    doc_title: doc.doc_title ?? null,
    doc_description: doc.doc_description ?? null,
    doc_type: doc.doc_type ?? null,
    tags_json: doc.tags_json ?? null,
    taxonomy_suggestions_json: doc.taxonomy_suggestions_json ?? null,
  };
}

function KebabMenu({ file, user, onAction }) {
  const [open, setOpen] = useState(false);
  const level = file?.accessLevel || "open_for_all";
  const developer = isDeveloperRole(user);
  const canOpen = level !== "high_security";
  const canDownload = developer
    ? level === "open_for_all"
    : level !== "high_security";

  return (
    <div className="frKebabWrap">
      <button
        className="frKebabBtn"
        onClick={() => setOpen((v) => !v)}
        aria-label="row menu"
      >
        ⋮
      </button>

      {open && (
        <div className="frMenu" onMouseLeave={() => setOpen(false)}>
          {canOpen && <button onClick={() => onAction("open")}>Open</button>}
          {canDownload && <button onClick={() => onAction("download")}>Download</button>}
          {!developer && (
            <>
              <button onClick={() => onAction("edit")}>Edit metadata</button>
              <button className="danger" onClick={() => onAction("delete")}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const EMBEDDING_MODEL = "Gemini gemini-embedding-001";

function FileDetailView({ file, onClose }) {
  const [detailTab, setDetailTab] = useState("chunks");
  const [chunks, setChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState(null);

  useEffect(() => {
    if (!file?.documentId || detailTab !== "chunks") return;
    setChunksLoading(true);
    setChunksError(null);
    documentsApi
      .getChunks(file.documentId)
      .then((res) => {
        setChunks(res?.chunks ?? []);
      })
      .catch((e) => {
        setChunksError(e.message || "Failed to load chunks");
        setChunks([]);
      })
      .finally(() => setChunksLoading(false));
  }, [file?.documentId, detailTab]);

  const detailTabs = [
    { id: "meta", label: "METADATA" },
    { id: "chunks", label: "VECTOR CHUNKS" },
    { id: "retriever", label: "RETRIEVAL SIM" },
  ];

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-label={`Details for ${file.name}`}>
      <div className="frFileDetailPanel">
        <div className="frFileDetailHeader">
          <h2 className="frFileDetailTitle">{file.name}</h2>
          <button type="button" className="frFileDetailClose" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="frFileDetailTabs">
          {detailTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`frFileDetailTab ${detailTab === t.id ? "frFileDetailTabActive" : ""}`}
              onClick={() => setDetailTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="frFileDetailBody">
          {detailTab === "meta" && (
            <div className="frMetaTab">
              <dl className="frMetaList">
                <dt>Name</dt>
                <dd>{file.name}</dd>
                <dt>ID</dt>
                <dd>{file.id}</dd>
                <dt>Access</dt>
                <dd><span className={`frAccessTag frAccessTag-${file.accessLevel || "open_for_all"}`}>{ACCESS_LEVELS[file.accessLevel || "open_for_all"]?.label || "Open for all"}</span></dd>
                <dt>Cluster</dt>
                <dd><span className="frClusterTag">{file.cluster}</span></dd>
                <dt>Created</dt>
                <dd>{file.created}</dd>
                <dt>Last modified</dt>
                <dd>{file.modified}</dd>
              </dl>
              {(file.doc_title != null && file.doc_title !== "") || (file.doc_description != null && file.doc_description !== "") || (file.doc_type != null && file.doc_type !== "") || (file.tags_json != null && file.tags_json !== "") || (file.taxonomy_suggestions_json != null && file.taxonomy_suggestions_json !== "") ? (
                <div className="frMetaSection">
                  <h3 className="frMetaSectionTitle">GPT-generated metadata</h3>
                  <dl className="frMetaList">
                    {(file.doc_title != null && file.doc_title !== "") && (<><dt>Title</dt><dd>{file.doc_title}</dd></>)}
                    {(file.doc_description != null && file.doc_description !== "") && (<><dt>Description</dt><dd>{file.doc_description}</dd></>)}
                    {(file.doc_type != null && file.doc_type !== "") && (<><dt>Doc type</dt><dd><span className="frClusterTag">{file.doc_type}</span></dd></>)}
                    {(() => {
                      try {
                        const tags = file.tags_json ? JSON.parse(file.tags_json) : null;
                        if (Array.isArray(tags) && tags.length > 0) return <><dt>Tags</dt><dd><div className="frTagsList">{tags.map((t, i) => <span key={i} className="frTag">{t}</span>)}</div></dd></>;
                      } catch { return null; }
                    })()}
                    {(() => {
                      try {
                        const tx = file.taxonomy_suggestions_json ? JSON.parse(file.taxonomy_suggestions_json) : null;
                        if (!tx || typeof tx !== "object") return null;
                        const domains = Array.isArray(tx.domains) ? tx.domains : [];
                        const ruleTypes = Array.isArray(tx.rule_types) ? tx.rule_types : [];
                        const appliesTo = Array.isArray(tx.applies_to) ? tx.applies_to : [];
                        if (domains.length === 0 && ruleTypes.length === 0 && appliesTo.length === 0) return null;
                        return (
                          <>
                            {domains.length > 0 && (<><dt>Domains</dt><dd><div className="frTagsList">{domains.map((d, i) => <span key={i} className="frTag frTagTaxonomy">{d}</span>)}</div></dd></>)}
                            {ruleTypes.length > 0 && (<><dt>Rule types</dt><dd><div className="frTagsList">{ruleTypes.map((r, i) => <span key={i} className="frTag frTagTaxonomy">{r}</span>)}</div></dd></>)}
                            {appliesTo.length > 0 && (<><dt>Applies to</dt><dd><div className="frTagsList">{appliesTo.map((a, i) => <span key={i} className="frTag frTagTaxonomy">{a}</span>)}</div></dd></>)}
                          </>
                        );
                      } catch { return null; }
                    })()}
                  </dl>
                </div>
              ) : null}
              {(file.accessLevel === "high_security") && (
                <p className="frMetaHint">This document is high security. Users can only see the name for answers — no open or download.</p>
              )}
            </div>
          )}

          {detailTab === "chunks" && (
            <div className="frChunksTab">
              <div className="frChunksBar">
                <span className="frChunksCount">{chunks.length} chunks</span>
                <span className="frChunksModel">{EMBEDDING_MODEL}</span>
              </div>
              {chunksLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#666" }}>Loading chunks…</div>
              ) : chunksError ? (
                <div style={{ padding: 24, textAlign: "center", color: "#c00" }} role="alert">{chunksError}</div>
              ) : (
                <table className="frChunksTable">
                  <thead>
                    <tr>
                      <th className="frChunksColNum">#</th>
                      <th className="frChunksColContent">CONTENT</th>
                      <th className="frChunksColTokens">TOKENS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunks.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                          No chunks yet. Document may still be processing.
                        </td>
                      </tr>
                    ) : (
                      chunks.map((c) => (
                        <tr key={c.index}>
                          <td className="frChunksColNum">{c.index}</td>
                          <td className="frChunksColContent">{c.content}</td>
                          <td className="frChunksColTokens">{c.tokens}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {detailTab === "retriever" && (
            <div className="frRetrieverTab">
              <div className="frChunksBar">
                <span className="frChunksCount">Retrieval similarity</span>
                <span className="frChunksModel">Top-K matches</span>
              </div>
              <table className="frChunksTable">
                <thead>
                  <tr>
                    <th className="frChunksColNum">#</th>
                    <th>Query / Snippet</th>
                    <th className="frChunksColTokens">Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>Sample query match from vector search…</td><td>0.94</td></tr>
                  <tr><td>2</td><td>Another similar chunk retrieved…</td><td>0.89</td></tr>
                  <tr><td>3</td><td>Third retrieval result snippet…</td><td>0.85</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="frFileDetailBackdrop" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

function EditDocumentModal({ file, onSave, onClose }) {
  const [docTitle, setDocTitle] = useState(file?.doc_title ?? "");
  const [docDescription, setDocDescription] = useState(file?.doc_description ?? "");
  const [docType, setDocType] = useState(file?.doc_type ?? "");
  const [tagsStr, setTagsStr] = useState(() => {
    try {
      const t = file?.tags_json ? JSON.parse(file.tags_json) : null;
      return Array.isArray(t) ? t.join(", ") : "";
    } catch {
      return "";
    }
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const tags = tagsStr.trim() ? tagsStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
      await onSave({
        doc_title: docTitle.trim() || null,
        doc_description: docDescription.trim() || null,
        doc_type: docType.trim() || null,
        tags: tags.length > 0 ? tags : null,
      });
      onClose();
    } catch (err) {
      setSaveError(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-label="Edit document metadata">
      <div className="frAddFilePanel">
        <div className="frFileDetailHeader">
          <h2 className="frFileDetailTitle">Edit metadata</h2>
          <button type="button" className="frFileDetailClose" onClick={onClose} aria-label="Close" disabled={saving}>✕</button>
        </div>
        <form className="frAddFileBody" onSubmit={handleSubmit} style={{ padding: 16 }}>
          <div className="frTrainField">
            <label className="frSmallLabel" htmlFor="edit-doc-title">Title</label>
            <input
              id="edit-doc-title"
              type="text"
              className="frTrainInput"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>
          <div className="frTrainField">
            <label className="frSmallLabel" htmlFor="edit-doc-desc">Description</label>
            <textarea
              id="edit-doc-desc"
              className="frTrainInput"
              rows={3}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div className="frTrainField">
            <label className="frSmallLabel" htmlFor="edit-doc-type">Doc type</label>
            <input
              id="edit-doc-type"
              type="text"
              className="frTrainInput"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="e.g. scope, terms, compliance"
            />
          </div>
          <div className="frTrainField">
            <label className="frSmallLabel" htmlFor="edit-doc-tags">Tags (comma-separated)</label>
            <input
              id="edit-doc-tags"
              type="text"
              className="frTrainInput"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="technical, security, 2025"
            />
          </div>
          {saveError && <div className="frTrainSubmitError" role="alert">{saveError}</div>}
          <div className="frAddFileFooter" style={{ marginTop: 16 }}>
            <button type="button" className="frAddFileCancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="frPrimaryBtn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
      <div className="frFileDetailBackdrop" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

const DEFAULT_CHUNK_SIZE = 200;
const DEFAULT_CHUNK_OVERLAP = 30;
const EMBEDDING_OPTIONS = [
  { id: "text-embedding-3-small", label: "OpenAI text-embedding-3-small" },
  { id: "text-embedding-3-large", label: "OpenAI text-embedding-3-large" },
  { id: "gemini-embedding-001", label: "Gemini gemini-embedding-001" },
];

function TrainDatasourceModal({ onClose, projectId, projectName, documentCount, projectsApi }) {
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_CHUNK_OVERLAP);
  const [embeddingModel] = useState(EMBEDDING_OPTIONS[0].id);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (projectId == null) {
      setSubmitError("No project selected.");
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);
    try {
      const res = await projectsApi.trainDatasource(projectId, {
        chunk_size_words: chunkSize,
        chunk_overlap_words: chunkOverlap,
        embedding_model: embeddingModel,
        include_metadata: includeMetadata,
      });
      setSubmitMessage(
        `Datasource trained. ${res.documents_synced} document(s) and ${res.chunks_synced} chunk(s) synced to ChromaDB.`
      );
    } catch (err) {
      setSubmitError(err.message || "Training failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) onClose();
  }

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-label="Train">
      <div className="frAddFilePanel frTrainDatasourcePanel">
        <div className="frFileDetailHeader">
          <h2 className="frFileDetailTitle">Train</h2>
          <button type="button" className="frFileDetailClose" onClick={handleClose} aria-label="Close" disabled={submitting}>✕</button>
        </div>

        <form className="frTrainDatasourceForm" onSubmit={handleSubmit}>
          <div className="frTrainDatasourceBody">
            <p className="frHint frTrainDatasourceIntro">
              Configure how this repository is used as a datasource for search and RAG. Settings apply to future ingestion; existing chunks use previous config.
            </p>

            <div className="frTrainFieldGroup">
              <div className="frTrainField">
                <label className="frSmallLabel" htmlFor="train-chunk-size">Words per chunk</label>
                <input
                  id="train-chunk-size"
                  type="number"
                  min={50}
                  max={500}
                  step={50}
                  className="frTrainInput"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value) || DEFAULT_CHUNK_SIZE)}
                />
                <span className="frTrainHint">Recommended: 150–250. Larger = fewer, longer chunks.</span>
              </div>
              <div className="frTrainField">
                <label className="frSmallLabel" htmlFor="train-chunk-overlap">Overlap (words)</label>
                <input
                  id="train-chunk-overlap"
                  type="number"
                  min={0}
                  max={100}
                  step={10}
                  className="frTrainInput"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value) || DEFAULT_CHUNK_OVERLAP)}
                />
                <span className="frTrainHint">Overlap between consecutive chunks for context.</span>
              </div>
            </div>

            <div className="frTrainField frTrainCheckboxWrap">
              <label className="frTrainCheckboxLabel">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="frTrainCheckbox"
                />
                <span>Include AI-generated metadata (title, tags, taxonomy) in retrieval</span>
              </label>
            </div>

            {submitMessage && (
              <div className="frTrainSubmitMessage" role="status">{submitMessage}</div>
            )}
            {submitError && (
              <div className="frTrainSubmitError" role="alert">{submitError}</div>
            )}
          </div>

          <div className="frAddFileFooter">
            <button type="button" className="frAddFileCancel" onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="frPrimaryBtn" disabled={submitting}>
              {submitting ? "Applying…" : "Advance settings"}
            </button>
          </div>
        </form>
      </div>
      <div className="frFileDetailBackdrop" onClick={handleClose} aria-hidden="true" />
    </div>
  );
}

/* Step 1: file selection only — no visibility */
function AddFileModalStep1({ onClose, onNext }) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [extractPdfImages, setExtractPdfImages] = useState(true);

  function onBrowseClick() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(e) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFiles(Array.from(e.dataTransfer.files || []));
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleSave() {
    if (selectedFiles.length === 0) return;
    onNext(selectedFiles, extractPdfImages);
  }

  function handleClose() {
    setSelectedFiles([]);
    onClose();
  }

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-label="Add new file">
      <div className="frAddFilePanel">
        <div className="frFileDetailHeader">
          <h2 className="frFileDetailTitle">Add new file</h2>
          <button type="button" className="frFileDetailClose" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="frAddFileBody">
          <div className="frTrainField frTrainCheckboxWrap" style={{ marginBottom: 16 }}>
            <label className="frTrainCheckboxLabel">
              <input
                type="checkbox"
                checked={extractPdfImages}
                onChange={(e) => setExtractPdfImages(e.target.checked)}
                className="frTrainCheckbox"
              />
              <span>Extract text from images in PDFs (for scanned documents)</span>
            </label>
          </div>

          <div
            className="frDropzone"
            onDrop={onDrop}
            onDragOver={onDragOver}
            role="button"
            tabIndex={0}
            onClick={onBrowseClick}
          >
            <div className="frDropIcon">⬆️</div>
            <div className="frDropText">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : "Drop your file here or browse"}
            </div>
            <div className="frDropSub">Max. file size 25 MB</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFilesSelected}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="frAddFileFooter">
          <button type="button" className="frAddFileCancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="frPrimaryBtn" onClick={handleSave} disabled={selectedFiles.length === 0}>
            Save
          </button>
        </div>
      </div>
      <div className="frFileDetailBackdrop" onClick={handleClose} aria-hidden="true" />
    </div>
  );
}

const CHUNK_SIZE_MIN = 50;
const CHUNK_SIZE_MAX = 500;
const CHUNK_SIZE_STEP = 50;

/* Step 2: visibility + chunks number — Save and Close closes modal and starts upload/chunking */
function AddFileModalStep2({ onClose, onConfirm }) {
  const [visibility, setVisibility] = useState("open_for_all");
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [chunkError, setChunkError] = useState(null);
  const [touched, setTouched] = useState(false);

  function validateChunkSize(val) {
    const n = Number(val);
    if (Number.isNaN(n) || n < CHUNK_SIZE_MIN || n > CHUNK_SIZE_MAX) {
      return `Enter a value between ${CHUNK_SIZE_MIN} and ${CHUNK_SIZE_MAX}`;
    }
    return null;
  }

  function handleChunkChange(e) {
    const val = e.target.value;
    setChunkSize(val === "" ? "" : Number(val) || DEFAULT_CHUNK_SIZE);
    if (touched) setChunkError(validateChunkSize(val === "" ? 0 : Number(val)));
    else setChunkError(null);
  }

  function handleChunkBlur() {
    setTouched(true);
    setChunkError(validateChunkSize(chunkSize));
  }

  function handleSaveAndClose() {
    const err = validateChunkSize(chunkSize);
    setChunkError(err);
    setTouched(true);
    if (err) return;
    const size = Math.min(CHUNK_SIZE_MAX, Math.max(CHUNK_SIZE_MIN, Number(chunkSize)));
    onConfirm(visibility, size);
  }

  const chunkInvalid = chunkError != null;
  const displayChunk = chunkSize === "" ? "" : chunkSize;

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-labelledby="frDocSettingsTitle" aria-describedby="frDocSettingsDesc">
      <div className="frAddFilePanel frDocumentSettingsPanel">
        <div className="frFileDetailHeader frDocSettingsHeader">
          <div>
            <h2 id="frDocSettingsTitle" className="frFileDetailTitle">Document settings</h2>
            <p id="frDocSettingsDesc" className="frDocSettingsSubtitle">Configure visibility and processing before upload.</p>
          </div>
          <button type="button" className="frFileDetailClose" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="frAddFileBody frDocSettingsBody">
          <section className="frDocSettingsSection" aria-labelledby="frDocVisibilityLabel">
            <label id="frDocVisibilityLabel" className="frDocSettingsLabel" htmlFor="addFileVisibility">Document visibility</label>
            <p className="frDocSettingsHint">Choose who can open or download this document and whether its URL is shown in search answers.</p>
            <select
              id="addFileVisibility"
              className="frDocSettingsSelect"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              aria-describedby="addFileVisibilityHint"
            >
              {Object.values(ACCESS_LEVELS).map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <span id="addFileVisibilityHint" className="frDocSettingsFieldHint">{ACCESS_LEVELS[visibility]?.desc}</span>
          </section>

          <section className="frDocSettingsSection" aria-labelledby="frDocChunkLabel" aria-invalid={chunkInvalid} aria-errormessage={chunkInvalid ? "frChunkSizeError" : undefined}>
            <label id="frDocChunkLabel" className="frDocSettingsLabel" htmlFor="addFileChunkSize">Words per chunk</label>
            <p className="frDocSettingsHint">Chunk size used when processing the document. Recommended: 150–250.</p>
            <input
              id="addFileChunkSize"
              type="number"
              min={CHUNK_SIZE_MIN}
              max={CHUNK_SIZE_MAX}
              step={CHUNK_SIZE_STEP}
              className={`frDocSettingsInput ${chunkInvalid ? "frDocSettingsInputInvalid" : ""}`}
              value={displayChunk}
              onChange={handleChunkChange}
              onBlur={handleChunkBlur}
              aria-invalid={chunkInvalid}
              aria-errormessage="frChunkSizeError"
              aria-describedby="frChunkSizeError"
            />
            {chunkError && (
              <p id="frChunkSizeError" className="frDocSettingsError" role="alert">{chunkError}</p>
            )}
          </section>
        </div>

        <div className="frAddFileFooter frDocSettingsFooter">
          <button type="button" className="frAddFileCancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="frPrimaryBtn frDocSettingsPrimaryBtn" onClick={handleSaveAndClose}>
            Save and Close
          </button>
        </div>
      </div>
      <div className="frFileDetailBackdrop" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

export default function FileRepository() {
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const canManage = canManageFiles(user);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [addFileStep2, setAddFileStep2] = useState(null);
  const [showTrainDatasourceModal, setShowTrainDatasourceModal] = useState(false);

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastAssignedCluster, setLastAssignedCluster] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [uploadAccessLevel, setUploadAccessLevel] = useState("open_for_all");

  const queryClient = useQueryClient();
  const pageSize = 5;

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["filerepo", "projects"],
    queryFn: () => projectsApi.list(),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId == null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const {
    data: documents = [],
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["filerepo", "documents", selectedProjectId],
    queryFn: () => projectsApi.listDocuments(selectedProjectId, 0, 500),
    enabled: selectedProjectId != null,
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: faqsData,
    isLoading: faqsLoading,
    error: faqsError,
  } = useQuery({
    queryKey: ["filerepo", "faqs"],
    queryFn: () => dashboardApi.getFaqs(),
    enabled: tab === "FAQs",
    staleTime: 2 * 60 * 1000,
  });

  const faqItems = faqsData?.items ?? [];
  const loading = projectsLoading || (selectedProjectId != null && documentsLoading && tab !== "FAQs") || (tab === "FAQs" && faqsLoading);
  const error = projectsError?.message ?? documentsError?.message ?? (tab === "FAQs" ? faqsError?.message : null) ?? null;

  useEffect(() => {
    logPageView(activityApi, user, "File Repository");
  }, [user?.name, user?.email]);

  const allFiles = useMemo(() => documents.map(docToFile), [documents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFiles.filter((f) => {
      const matchesTab = tab === "All" ? true : f.cluster === tab;
      const matchesSearch =
        !q ||
        (f.folder && f.folder.toLowerCase().includes(q)) ||
        f.name.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [tab, search, allFiles]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  // FAQs section: paginate FAQ list (All section does not show FAQs — documents only)
  const faqTotal = faqItems.length;
  const faqTotalPages = Math.max(1, Math.ceil(faqTotal / pageSize));
  const faqSafePage = Math.min(page, faqTotalPages);
  const faqPageItems = useMemo(() => {
    const start = (faqSafePage - 1) * pageSize;
    return faqItems.slice(start, start + pageSize);
  }, [faqItems, faqSafePage]);

  function onBrowseClick() {
    fileInputRef.current?.click();
  }

  async function processUpload(files, accessLevelOverride, onDone, extractPdfImages = true) {
    if (!files || files.length === 0) return;
    const projId = selectedProjectId ?? projects[0]?.id;
    if (!projId || !user?.id) {
      setError("Select a project and sign in to upload.");
      onDone?.();
      return;
    }
    const level = accessLevelOverride ?? uploadAccessLevel;
    setUploadAccessLevel(level);
    setCompleted(false);
    setLastAssignedCluster(null);
    setError(null);
    setUploading(true);
    setProgress(10);

    try {
      setAnalyzing(true);
      const clusters = [];
      const docIds = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(10 + Math.round((i / files.length) * 80));
        const res = await documentsApi.upload(projId, user.id, file, { extractPdfImages });
        docIds.push(res.id);
        const doc = await documentsApi.get(res.id);
        clusters.push(doc.cluster || "Integrations");
      }
      setProgress(100);
      setLastAssignedCluster(clusters.length === 1 ? clusters[0] : clusters.join(", "));
      setCompleted(true);
      for (const id of docIds) {
        try {
          await documentsApi.generateMetadata(id);
        } catch (_) {
          /* non-blocking; metadata may be generated in background by backend */
        }
      }
      queryClient.invalidateQueries({ queryKey: ["filerepo", "documents", projId] });
      for (let i = 0; i < files.length; i++) {
        try {
          await activityApi.create({
            actor: user?.name || user?.email || "User",
            event_action: "File uploaded",
            target_resource: files[i]?.name ? String(files[i].name) : "Document",
            severity: "info",
            system: "web",
          });
          const docId = docIds[i];
          await accessIntelligenceApi.create({
            user_id: user?.id ?? null,
            username: user?.name || user?.email || "User",
            document_name: files[i]?.name ? String(files[i].name) : "Document",
            document_id: docId ? String(docId) : null,
            access_level: level,
            action: "upload",
          });
        } catch {
          /* non-blocking */
        }
      }
      onDone?.();
    } catch (e) {
      setError(e.message || "Upload failed");
      onDone?.();
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  }

  function onFilesSelected(e) {
    const files = e.target.files;
    processUpload(files);
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    processUpload(files);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const modalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <AppShell mainClassName="main">
    <div className="frPage">
      {modalTarget && selectedFile && createPortal(
        <FileDetailView file={selectedFile} onClose={() => setSelectedFile(null)} />,
        modalTarget
      )}
      {modalTarget && editFile && createPortal(
        <EditDocumentModal
          file={editFile}
          onSave={async (body) => {
            await documentsApi.update(editFile.documentId, body);
            queryClient.invalidateQueries({ queryKey: ["filerepo", "documents", selectedProjectId] });
          }}
          onClose={() => setEditFile(null)}
        />,
        modalTarget
      )}
      {error && (
        <div className="frError" role="alert" style={{ padding: 12, background: "#fee", color: "#c00", marginBottom: 16, borderRadius: 8 }}>
          {error}
        </div>
      )}
      {modalTarget && showAddFileModal && createPortal(
        <AddFileModalStep1
          onClose={() => setShowAddFileModal(false)}
          onNext={(files, extractPdfImages) => {
            setShowAddFileModal(false);
            setAddFileStep2({ files, extractPdfImages });
          }}
        />,
        modalTarget
      )}
      {modalTarget && addFileStep2 && createPortal(
        <AddFileModalStep2
          onClose={() => setAddFileStep2(null)}
          onConfirm={(visibility) => {
            const { files, extractPdfImages } = addFileStep2;
            setAddFileStep2(null);
            processUpload(files, visibility, () => {}, extractPdfImages);
          }}
        />,
        modalTarget
      )}
      {modalTarget && showTrainDatasourceModal && createPortal(
        <TrainDatasourceModal
          onClose={() => setShowTrainDatasourceModal(false)}
          projectId={selectedProjectId}
          projectName={projects.find((p) => p.id === selectedProjectId)?.name}
          documentCount={documents.length}
          projectsApi={projectsApi}
        />,
        modalTarget
      )}

      {/* Header */}
      <div className="frHeader">
        <div className="frHeaderTop">
          <div>
            <h1 className="frTitle">Contextual Document Segmentation</h1>
            <p className="frSubtitle">Documents grouped by contextual meaning and topic similarity</p>
          </div>
          <div className="frHeaderActions">
            {canManage && (
              <>
                <button type="button" className="frTrainDatasourceBtn" onClick={() => setShowTrainDatasourceModal(true)}>
                  Train Data
                </button>
                <button type="button" className="frAddNewFileBtn" onClick={() => setShowAddFileModal(true)}>
                  <span className="frPlus">＋</span> Add new file
                </button>
              </>
            )}
          </div>
        </div>

        <div className="frTabs">
          {CLUSTERS.map((t) => (
            <button
              key={t}
              className={`frTab ${tab === t ? "frTabActive" : ""}`}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="frTableCard">
        <table className={`frTable ${tab === "FAQs" ? "frTable--faqs" : ""}`}>
          <thead>
            <tr>
              {tab === "FAQs" ? (
                <>
                  <th><span className="thIcon">❓</span> QUESTION</th>
                  <th><span className="thIcon">💬</span> ANSWER</th>
                </>
              ) : (
                <>
                  <th className="wFolder">
                    <span className="thIcon">🏷️</span> CLUSTER
                  </th>
                  <th>
                    <span className="thIcon">✎</span> NAME
                  </th>
                  <th className="wCreated">
                    <span className="thIcon">📅</span> CREATED{" "}
                    <span className="sortIcon">▴▾</span>
                  </th>
                  <th className="wModified">
                    <span className="thIcon">✎</span> LAST MODIFIED
                  </th>
                  <th className="wAccess">
                    <span className="thIcon">🔒</span> ACCESS
                  </th>
                  {canSeeRowActions(user) && <th className="wMenu"></th>}
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tab === "FAQs" ? 2 : (canSeeRowActions(user) ? 6 : 5)} style={{ padding: 24, textAlign: "center" }}>
                  {tab === "FAQs" ? "Loading FAQs…" : "Loading documents…"}
                </td>
              </tr>
            ) : tab === "FAQs" ? (
              faqPageItems.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                    No FAQs yet. Add answers from Intelligence Hub → Review gaps.
                  </td>
                </tr>
              ) : (
                faqPageItems.map((faq) => (
                  <tr key={faq.faqId}>
                    <td className="frFaqQuestion"><div className="frFaqCellInner">{faq.question}</div></td>
                    <td className="frFaqAnswer"><div className="frFaqCellInner">{faq.answer}</div></td>
                  </tr>
                ))
              )
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={canSeeRowActions(user) ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "#666" }}>No documents yet. Upload a file below.</td></tr>
            ) : (
            pageItems.map((r) => (
              <tr key={r.id}>
                <td className="cellMuted"><span className="frClusterTag">{r.cluster}</span></td>
                <td>
                  {canSeeRowActions(user) ? (
                    <button
                      type="button"
                      className="frFileNameBtn"
                      onClick={() => {
                        setSelectedFile(r);
                        accessIntelligenceApi.create({
                          user_id: user?.id ?? null,
                          username: user?.name || user?.email || "User",
                          document_name: r.name || String(r.id),
                          document_id: r.documentId ? String(r.documentId) : null,
                          access_level: r.accessLevel || "open_for_all",
                          action: "view",
                        }).catch(() => {});
                      }}
                    >
                      {r.name}
                    </button>
                  ) : (
                    <span className="frFileNameBtn frFileNameBtn--readOnly">{r.name}</span>
                  )}
                </td>
                <td className="cellMuted">{r.created}</td>
                <td className="cellMuted">{r.modified}</td>
                <td className="cellMuted">
                  <span className={`frAccessTag frAccessTag-${r.accessLevel || "open_for_all"}`}>
                    {ACCESS_LEVELS[r.accessLevel || "open_for_all"]?.label || "Open for all"}
                  </span>
                </td>
                {canSeeRowActions(user) && (
                <td className="cellMenu">
                  <KebabMenu
                  file={r}
                  user={user}
                  onAction={async (action) => {
                    if (action === "open") {
                      setSelectedFile(r);
                      try {
                        await activityApi.create({
                          actor: user?.name || user?.email || "User",
                          event_action: "Document viewed",
                          target_resource: r.name || String(r.id),
                          severity: "info",
                          system: "web",
                        });
                        await accessIntelligenceApi.create({
                          user_id: user?.id ?? null,
                          username: user?.name || user?.email || "User",
                          document_name: r.name || String(r.id),
                          document_id: r.documentId ? String(r.documentId) : null,
                          access_level: r.accessLevel || "open_for_all",
                          action: "view",
                        });
                      } catch {
                        /* non-blocking */
                      }
                    } else if (action === "download") {
                      try {
                        const url = `${API_BASE}/api/v1/documents/${r.documentId}/download`;
                        const token = getToken();
                        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                        if (res.ok) {
                          const blob = await res.blob();
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = r.name || "download";
                          a.click();
                          URL.revokeObjectURL(a.href);
                          try {
                            await accessIntelligenceApi.create({
                              user_id: user?.id ?? null,
                              username: user?.name || user?.email || "User",
                              document_name: r.name || String(r.id),
                              document_id: r.documentId ? String(r.documentId) : null,
                              access_level: r.accessLevel || "open_for_all",
                              action: "download",
                            });
                          } catch {
                            /* non-blocking */
                          }
                        }
                      } catch {
                        /* ignore */
                      }
                    } else if (action === "edit") {
                      setEditFile(r);
                    } else if (action === "delete") {
                      if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
                      try {
                        await documentsApi.delete(r.documentId);
                        setError(null);
                        queryClient.invalidateQueries({ queryKey: ["filerepo", "documents", selectedProjectId] });
                        if (selectedFile?.documentId === r.documentId) setSelectedFile(null);
                      } catch (e) {
                        setError(e.message || "Delete failed");
                      }
                    }
                  }}
                />
                </td>
                )}
              </tr>
            ))
            )}
          </tbody>
        </table>

        <div className="frTableFooter">
          <div className="frCount">
            {tab === "FAQs"
              ? `${(faqSafePage - 1) * pageSize + 1}-${Math.min(faqSafePage * pageSize, faqTotal)} of ${faqTotal}`
              : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, total)} of ${total}`}
          </div>

          <div className="frPager">
            <button
              className="frPagerBtn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={tab === "FAQs" ? faqSafePage === 1 : safePage === 1}
              aria-label="prev"
            >
              ‹
            </button>
            <button
              className="frPagerBtn"
              onClick={() => setPage((p) => Math.min(tab === "FAQs" ? faqTotalPages : totalPages, p + 1))}
              disabled={tab === "FAQs" ? faqSafePage === faqTotalPages : safePage === totalPages}
              aria-label="next"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
