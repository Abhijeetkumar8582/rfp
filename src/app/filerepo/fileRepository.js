"use client";

import React, { useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import "../css/filerepository.css";

// Semantic clusters — documents are auto-assigned to these by meaning (vector similarity)
const CLUSTERS = ["All", "Security", "Finance", "Architecture", "Compliance", "Integrations"];

// Document access levels: controls whether URL is shown, and open/download allowed
export const ACCESS_LEVELS = {
  open_for_all: { id: "open_for_all", label: "Open for all", desc: "Anyone can open, download, and see document URL in answers." },
  team_specific: { id: "team_specific", label: "Team specific", desc: "Only your team can open and download; others see name only in answers." },
  high_security: { id: "high_security", label: "High security", desc: "Name only for answers — no open, no download, no URL shown." },
};

const SEED_FILES = [
  { id: "f1", folder: "Documents", name: "companies_demo_export_xlsx", created: "2022-02-02 11:54", modified: "2022-02-12 10:03", cluster: "Finance", accessLevel: "open_for_all" },
  { id: "f2", folder: "Download Center", name: "sso_security_policy.pdf", created: "2021-10-15 15:14", modified: "2021-12-12 10:20", cluster: "Security", accessLevel: "high_security" },
  { id: "f3", folder: "Report", name: "system_architecture_diagram.pdf", created: "2022-09-02 14:02", modified: "2021-11-10 11:03", cluster: "Architecture", accessLevel: "team_specific" },
  { id: "f4", folder: "Other", name: "gdpr_compliance_checklist.xlsx", created: "2021-09-01 11:30", modified: "2022-11-11 10:10", cluster: "Compliance", accessLevel: "high_security" },
  { id: "f5", folder: "Other", name: "api_integration_spec.xlsx", created: "2021-08-03 11:40", modified: "2022-08-11 12:10", cluster: "Integrations", accessLevel: "open_for_all" },
];

/**
 * Semantic classifier: infers cluster from filename/content (simulates vector similarity).
 * In production, replace with an API that returns cluster from document embeddings.
 */
function classifyDocument(filename) {
  const lower = (filename || "").toLowerCase();
  const security = /security|sso|auth|policy|audit|firewall|encryption|vpn|access/i;
  const finance = /budget|cost|invoice|revenue|financial|quote|pricing|companies|export/i;
  const architecture = /architecture|diagram|system|design|infra|deploy|spec/i;
  const compliance = /compliance|gdpr|regulatory|legal|soc|iso|certification/i;
  const integrations = /integration|api|connector|webhook|sdk|plugin/i;
  if (security.test(lower)) return "Security";
  if (finance.test(lower)) return "Finance";
  if (architecture.test(lower)) return "Architecture";
  if (compliance.test(lower)) return "Compliance";
  if (integrations.test(lower)) return "Integrations";
  return "Integrations"; // default
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

function formatDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Generate mock vector chunks for a file (replace with API in production). */
function getMockChunks(file, count = 12) {
  const base = `${file.name} — Cluster: ${file.cluster}. Document content: Purpose The purpose of this document is to provide structured information. Scope This outlines the key sections, metadata, and vector chunks used for retrieval. Responsibilities Content is chunked for embedding and similarity search.`;
  const chunks = [];
  const words = base.split(/\s+/);
  const wordsPerChunk = Math.max(20, Math.ceil(words.length / count));
  for (let i = 0; i < count; i++) {
    const start = i * wordsPerChunk;
    const slice = words.slice(start, start + wordsPerChunk).join(" ");
    const content = slice || `Chunk ${i + 1} placeholder.`;
    chunks.push({ index: i + 1, content, tokens: Math.min(128, Math.ceil(content.length / 4)) });
  }
  return chunks;
}

const EMBEDDING_MODEL = "Gemini gemini-embedding-001";

function FileDetailView({ file, onClose }) {
  const [detailTab, setDetailTab] = useState("chunks");
  const chunks = useMemo(() => getMockChunks(file), [file]);

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
                <dt>Name</dt><dd>{file.name}</dd>
                <dt>Access</dt><dd><span className={`frAccessTag frAccessTag-${file.accessLevel || "open_for_all"}`}>{ACCESS_LEVELS[file.accessLevel || "open_for_all"]?.label || "Open for all"}</span></dd>
                <dt>Cluster</dt><dd><span className="frClusterTag">{file.cluster}</span></dd>
                <dt>Created</dt><dd>{file.created}</dd>
                <dt>Last modified</dt><dd>{file.modified}</dd>
                <dt>ID</dt><dd>{file.id}</dd>
              </dl>
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
              <table className="frChunksTable">
                <thead>
                  <tr>
                    <th className="frChunksColNum">#</th>
                    <th className="frChunksColContent">Content</th>
                    <th className="frChunksColTokens">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {chunks.map((c) => (
                    <tr key={c.index}>
                      <td className="frChunksColNum">{c.index}</td>
                      <td className="frChunksColContent">{c.content}</td>
                      <td className="frChunksColTokens">{c.tokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default function FileRepository() {
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [page, setPage] = useState(1);

  // Uploaded files (with auto-assigned cluster); merged with SEED_FILES for display
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastAssignedCluster, setLastAssignedCluster] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadAccessLevel, setUploadAccessLevel] = useState("open_for_all");

  const pageSize = 5;

  const allFiles = useMemo(() => [...SEED_FILES, ...uploadedFiles], [uploadedFiles]);

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

  function processUpload(files) {
    if (!files || files.length === 0) return;
    setCompleted(false);
    setLastAssignedCluster(null);
    setUploading(true);
    setProgress(0);

    let p = 0;
    const progressTimer = setInterval(() => {
      p += Math.floor(Math.random() * 12) + 6;
      if (p >= 100) {
        clearInterval(progressTimer);
        setProgress(100);
        setUploading(false);
        // Simulate semantic analysis (vector similarity) before assigning cluster
        setAnalyzing(true);
        setTimeout(() => {
          const now = formatDate();
          const newEntries = Array.from(files).map((file, idx) => {
            const cluster = classifyDocument(file.name);
            return {
              id: `upload-${Date.now()}-${idx}`,
              folder: cluster,
              name: file.name,
              created: now,
              modified: now,
              cluster,
              accessLevel: uploadAccessLevel,
            };
          });
          setUploadedFiles((prev) => [...prev, ...newEntries]);
          setLastAssignedCluster(
            newEntries.length === 1 ? newEntries[0].cluster : newEntries.map((e) => e.cluster).join(", ")
          );
          setAnalyzing(false);
          setCompleted(true);
        }, 800);
      } else {
        setProgress(p);
      }
    }, 300);
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
      {/* Header */}
      <div className="frHeader">
        <h1 className="frTitle">Repository</h1>
        <p className="frSubtitle">Semantic clusters — documents auto-assigned by meaning</p>

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
            {pageItems.map((r) => (
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
                  <KebabMenu file={r} onAction={(a) => console.log(a, r.id)} />
                </td>
              </tr>
            ))}
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

      {/* Upload section — cluster is auto-assigned by semantic analysis */}
      <div className="frUploadSection">
        <h2 className="frUploadTitle">Add file to repository</h2>
        <p className="frUploadHint">Documents are automatically assigned to a cluster (Security, Finance, Architecture, Compliance, Integrations) by semantic analysis.</p>

        <div className="frUploadVisibility">
          <span className="frSmallLabel">Document visibility</span>
          <p className="frHint">Choose who can open/download and whether the document URL is shown in search answers.</p>
          <div className="frVisibilityOptions">
            {Object.values(ACCESS_LEVELS).map((opt) => (
              <label key={opt.id} className={`frVisibilityOption ${uploadAccessLevel === opt.id ? "frVisibilityOptionActive" : ""}`}>
                <input
                  type="radio"
                  name="uploadAccessLevel"
                  value={opt.id}
                  checked={uploadAccessLevel === opt.id}
                  onChange={() => setUploadAccessLevel(opt.id)}
                />
                <span className="frVisibilityLabel">{opt.label}</span>
                <span className="frVisibilityDesc">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="frUploadGrid">
          {/* Dropzone */}
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
              Drop your file here or <span className="frLink">browse</span>
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

          {/* Status cards */}
          <div className="frStatusCol">
            <div className={`frStatusCard ${uploading || analyzing ? "active" : ""}`}>
              <div className="frStatusTop">
                <div>
                  <div className="frStatusTitle">
                    {analyzing ? "Analyzing document…" : uploading ? "Uploading…" : "—"}
                  </div>
                  <div className="frStatusSub">
                    {analyzing ? "Assigning cluster by meaning" : uploading ? `${progress}%` : "—"}
                  </div>
                </div>
                <button
                  className="frStatusClose"
                  onClick={() => {
                    setUploading(false);
                    setAnalyzing(false);
                    setProgress(0);
                    setCompleted(false);
                  }}
                  aria-label="cancel"
                >
                  ✕
                </button>
              </div>
              <div className="frBar">
                <div className="frBarFill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className={`frStatusCard ${completed ? "success" : ""}`}>
              <div className="frStatusTop">
                <div className="frStatusTitle">Completed!</div>
                <div className="frStatusSub">
                  {completed
                    ? (lastAssignedCluster
                      ? `Assigned to: ${lastAssignedCluster}`
                      : "File uploaded successfully")
                    : "—"}
                </div>
                <div className="frStatusCheck">✓</div>
              </div>
            </div>
          </div>
        </div>

        <div className="frDoneRow">
          <button className="frDoneBtn">Done!</button>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
