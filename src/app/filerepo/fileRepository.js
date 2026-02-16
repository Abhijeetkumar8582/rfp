"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { projects as projectsApi, documents as documentsApi, activity as activityApi, API_BASE, getToken } from "../../lib/api";
import "../css/filerepository.css";

function logPageView(activityApi, user, resource) {
  activityApi.create({
    actor: user?.name || user?.email || "User",
    event_action: "Page viewed",
    target_resource: resource,
    severity: "info",
    system: "web",
  }).catch(() => {});
}

// Semantic clusters — documents are auto-assigned to these by meaning (vector similarity)
const CLUSTERS = ["All", "Security", "Finance", "Architecture", "Compliance", "Integrations"];

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

function KebabMenu({ file, onAction }) {
  const [open, setOpen] = useState(false);
  const level = file?.accessLevel || "open_for_all";
  const canOpen = level !== "high_security";
  const canDownload = level !== "high_security";

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
          <button onClick={() => onAction("rename")}>Rename</button>
          <button className="danger" onClick={() => onAction("delete")}>
            Delete
          </button>
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

function AddFileModal({ onClose, onUpload, uploading, progress }) {
  const fileInputRef = useRef(null);
  const [visibility, setVisibility] = useState("open_for_all");
  const [selectedFiles, setSelectedFiles] = useState([]);

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

  function handleUpload() {
    if (selectedFiles.length === 0) return;
    onUpload(selectedFiles, visibility);
  }

  function handleClose() {
    if (!uploading) {
      setSelectedFiles([]);
      onClose();
    }
  }

  return (
    <div className="frFileDetailOverlay" role="dialog" aria-modal="true" aria-label="Add new file">
      <div className="frAddFilePanel">
        <div className="frFileDetailHeader">
          <h2 className="frFileDetailTitle">Add new file</h2>
          <button type="button" className="frFileDetailClose" onClick={handleClose} aria-label="Close" disabled={uploading}>✕</button>
        </div>

        <div className="frAddFileBody">
          <div className="frUploadVisibility">
            <label className="frSmallLabel" htmlFor="addFileVisibility">Document visibility</label>
            <p className="frHint">Choose who can open/download and whether the document URL is shown in search answers.</p>
            <select
              id="addFileVisibility"
              className="frVisibilitySelect"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              {Object.values(ACCESS_LEVELS).map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
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

          {uploading && (
            <div className="frAddFileProgress">
              <div className="frStatusTitle">Uploading… {progress}%</div>
              <div className="frBar">
                <div className="frBarFill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="frAddFileFooter">
          <button type="button" className="frAddFileCancel" onClick={handleClose} disabled={uploading}>
            Cancel
          </button>
          <button type="button" className="frPrimaryBtn" onClick={handleUpload} disabled={selectedFiles.length === 0 || uploading}>
            <span className="frPlus">＋</span> Upload
          </button>
        </div>
      </div>
      <div className="frFileDetailBackdrop" onClick={handleClose} aria-hidden="true" />
    </div>
  );
}

export default function FileRepository() {
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const [showAddFileModal, setShowAddFileModal] = useState(false);

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [page, setPage] = useState(1);

  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastAssignedCluster, setLastAssignedCluster] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadAccessLevel, setUploadAccessLevel] = useState("open_for_all");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const pageSize = 5;

  useEffect(() => {
    logPageView(activityApi, user, "File Repository");
  }, [user?.name, user?.email]);

  const fetchProjects = useCallback(async () => {
    try {
      const list = await projectsApi.list();
      setProjects(list);
      if (list.length > 0) {
        setSelectedProjectId((prev) => prev ?? list[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const list = await documentsApi.list(selectedProjectId, 0, 500);
      setDocuments(list);
    } catch (e) {
      setError(e.message);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    setLoading(true);
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  useEffect(() => {
    if (!loading && selectedProjectId != null) {
      fetchDocuments();
    }
  }, [loading, selectedProjectId, fetchDocuments]);

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

  function onBrowseClick() {
    fileInputRef.current?.click();
  }

  async function processUpload(files, accessLevelOverride, onDone) {
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
        const res = await documentsApi.upload(projId, user.id, file);
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
      fetchDocuments();
      for (let i = 0; i < files.length; i++) {
        try {
          await activityApi.create({
            actor: user?.name || user?.email || "User",
            event_action: "File uploaded",
            target_resource: files[i]?.name ? String(files[i].name) : "Document",
            severity: "info",
            system: "web",
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

  return (
    <AppShell mainClassName="main">
    <div className="frPage">
      {selectedFile && (
        <FileDetailView file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
      {error && (
        <div className="frError" role="alert" style={{ padding: 12, background: "#fee", color: "#c00", marginBottom: 16, borderRadius: 8 }}>
          {error}
        </div>
      )}
      {showAddFileModal && (
        <AddFileModal
          onClose={() => setShowAddFileModal(false)}
          onUpload={(files, accessLevel) => processUpload(files, accessLevel, () => setShowAddFileModal(false))}
          uploading={uploading}
          progress={progress}
        />
      )}

      {/* Header */}
      <div className="frHeader">
        <div className="frHeaderTop">
          <div>
            <h1 className="frTitle">Repository</h1>
            <p className="frSubtitle">Semantic clusters — documents auto-assigned by meaning</p>
          </div>
          <button type="button" className="frAddNewFileBtn" onClick={() => setShowAddFileModal(true)}>
            <span className="frPlus">＋</span> Add new file
          </button>
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

      {/* Cluster view — powered by vector similarity */}
      <div className="frClusterView">
        <h2 className="frClusterViewTitle">
          Cluster view <span className="frClusterBadge">Powered by vector similarity</span>
        </h2>
        <div className="frClusterGrid">
          {CLUSTERS.filter((c) => c !== "All").map((clusterName) => {
            const count = allFiles.filter((f) => f.cluster === clusterName).length;
            return (
              <button
                key={clusterName}
                type="button"
                className={`frClusterCard ${tab === clusterName ? "frClusterCardActive" : ""}`}
                onClick={() => {
                  setTab(clusterName);
                  setPage(1);
                }}
              >
                <span className="frClusterCardName">{clusterName}</span>
                <span className="frClusterCardCount">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="frControls">
        <div className="frSearch">
          <span className="frSearchIcon">🔎</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search a folder"
          />
        </div>

        <button className="frFilterBtn">
          <span className="frFilterIcon">⏷</span> Filters
        </button>

        <div className="frSpacer" />

        <button className="frPrimaryBtn">
          <span className="frPlus">＋</span> Add a folder
        </button>
      </div>

      {/* Table */}
      <div className="frTableCard">
        <table className="frTable">
          <thead>
            <tr>
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
              <th className="wMenu"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>Loading documents…</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#666" }}>No documents yet. Upload a file below.</td></tr>
            ) : (
            pageItems.map((r) => (
              <tr key={r.id}>
                <td className="cellMuted"><span className="frClusterTag">{r.cluster}</span></td>
                <td>
                  <button
                    type="button"
                    className="frFileNameBtn"
                    onClick={() => setSelectedFile(r)}
                  >
                    {r.name}
                  </button>
                </td>
                <td className="cellMuted">{r.created}</td>
                <td className="cellMuted">{r.modified}</td>
                <td className="cellMuted">
                  <span className={`frAccessTag frAccessTag-${r.accessLevel || "open_for_all"}`}>
                    {ACCESS_LEVELS[r.accessLevel || "open_for_all"]?.label || "Open for all"}
                  </span>
                </td>
                <td className="cellMenu">
                  <KebabMenu
                  file={r}
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
                        }
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                />
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>

        <div className="frTableFooter">
          <div className="frCount">
            {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, total)}{" "}
            of {total}
          </div>

          <div className="frPager">
            <button
              className="frPagerBtn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="prev"
            >
              ‹
            </button>
            <button
              className="frPagerBtn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
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
