"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { activity as activityApi, search as searchApi, projects as projectsApi } from "../../lib/api";
import "../css/SearchSection.css";

function IconUser() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20v-2a5 5 0 0 1 10 0v2" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15 9 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 9" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconRegenerate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function SearchSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [language, setLanguage] = useState("en");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list || []);
      if (list?.length > 0 && selectedProjectId == null) {
        setSelectedProjectId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const languages = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "hi", label: "हिन्दी" },
  ];
  const currentLanguageLabel = languages.find((l) => l.code === language)?.label ?? "English";

  async function handleSubmit(e) {
    e?.preventDefault();
    const q = (query || "").trim();
    if (!q) return;
    if (selectedProjectId == null) {
      setSearchError("Select a project to search.");
      return;
    }
    setSubmittedQuery(q);
    setHasSearched(true);
    setSearchError(null);
    setSearchResults(null);
    setSearchLoading(true);
    try {
      const res = await searchApi.answer(q, selectedProjectId, 10);
      setSearchResults(res);
      activityApi.create({
        actor: user?.name || user?.email || "User",
        event_action: "Search query",
        target_resource: q.length > 200 ? q.slice(0, 200) + "…" : q,
        severity: "info",
        system: "web",
      }).catch(() => {});
    } catch (err) {
      setSearchError(err.message || "Search failed.");
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleCopyResults() {
    const parts = [];
    if (searchResults?.answer) {
      parts.push("Answer:\n" + searchResults.answer);
    }
    if (searchResults?.results?.length) {
      parts.push(
        "Sources:\n" +
        searchResults.results
          .map((r, i) => `[${i + 1}] ${r.filename} (score: ${r.score})\n${r.content}`)
          .join("\n\n---\n\n")
      );
    }
    if (parts.length) navigator.clipboard?.writeText(parts.join("\n\n"));
  }

  return (
    <div className="searchPageBard">
      {/* Top header: bot name + language selector */}
      <header className="searchPageTopHeader">
        <h1 className="searchPageBotName">RFP Assistant</h1>
        <div className="searchPageHeaderRight">
          {projects.length > 0 && (
            <label className="searchPageProjectWrap">
              <span className="searchPageProjectLabel">Project</span>
              <select
                className="searchPageProjectSelect"
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                aria-label="Project to search"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="searchPageLangWrap">
          <button
            type="button"
            className="searchPageLangTrigger"
            onClick={() => setLanguageDropdownOpen((o) => !o)}
            aria-expanded={languageDropdownOpen}
            aria-haspopup="listbox"
            aria-label="Select language"
          >
            <span className="searchPageLangLabel">{currentLanguageLabel}</span>
            <svg className="searchPageLangChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {languageDropdownOpen && (
            <>
              <div className="searchPageLangBackdrop" onClick={() => setLanguageDropdownOpen(false)} aria-hidden="true" />
              <ul className="searchPageLangDropdown" role="listbox">
                {languages.map(({ code, label }) => (
                  <li key={code} role="option" aria-selected={language === code}>
                    <button
                      type="button"
                      className={`searchPageLangOption ${language === code ? "searchPageLangOptionActive" : ""}`}
                      onClick={() => {
                        setLanguage(code);
                        setLanguageDropdownOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          </div>
        </div>
      </header>

      <div className="searchPageBardContent">
        {/* Header: user query (shown after search) */}
        {hasSearched && submittedQuery && (
          <header className="searchBardHeader">
            <div className="searchBardHeaderAvatar">
              <IconUser />
            </div>
            <p className="searchBardHeaderQuery">{submittedQuery}</p>
            <button type="button" className="searchBardHeaderEdit" aria-label="Edit query">
              <IconEdit />
            </button>
          </header>
        )}

        {/* Main: search results from ChromaDB (question embedding vs document embeddings) */}
        {hasSearched && (
          <section className="searchBardResponse">
            <div className="searchBardResponseInner">
              <div className="searchBardResponseAvatar">
                <IconStar />
              </div>
              <div className="searchBardResponseBody">
                {searchLoading && (
                  <p className="searchBardIntro">Searching your documents and generating an answer with GPT…</p>
                )}
                {searchError && (
                  <p className="searchBardSearchError" role="alert">{searchError}</p>
                )}
                {!searchLoading && searchResults && (
                  <>
                    {searchResults.answer != null && searchResults.answer !== "" && (
                      <div className="searchBardAnswerWrap">
                        <p className="searchBardAnswer">{searchResults.answer}</p>
                        <button type="button" className="searchBardActionBtn searchBardCopyAll" onClick={handleCopyResults} title="Copy answer and sources">
                          <IconCopy /> Copy all
                        </button>
                      </div>
                    )}
                    <div className="searchBardIntro">
                      <span>Sources ({searchResults.results?.length ?? 0} chunks from your knowledge base)</span>
                    </div>
                    <div className="searchBardResultsList">
                      {searchResults.results?.length === 0 ? (
                        <p className="searchBardNoResults">No matching chunks. Try a different question or train the datasource for this project.</p>
                      ) : (
                        searchResults.results?.map((r, i) => (
                          <div key={i} className="searchBardResultItem">
                            <div className="searchBardResultMeta">
                              <span className="searchBardResultFile">{r.filename || "Document"}</span>
                              <span className="searchBardResultScore">score: {r.score.toFixed(2)}</span>
                            </div>
                            <p className="searchBardResultContent">{r.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Empty state: show when no search yet */}
        {!hasSearched && (
          <div className="searchBardEmpty">
            <div className="searchBardEmptyAvatar">
              <IconStar />
            </div>
            <p className="searchBardEmptyText">Ask a question to search across your documents. Your question is embedded, matched against chunk embeddings, and answered by GPT using the top matches.</p>
          </div>
        )}
      </div>

      {/* Footer: input bar (always visible) */}
      <footer className="searchBardFooter">
        <form className="searchBardForm" onSubmit={handleSubmit}>
          <button type="button" className="searchBardFooterAdd" aria-label="Add attachment">
            <IconPlus />
          </button>
          <input
            type="text"
            className="searchBardInput"
            placeholder="Message Bard..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Message input"
          />
          <button type="button" className="searchBardFooterMic" aria-label="Voice input">
            <IconMic />
          </button>
          <button type="submit" className="searchBardFooterSend" aria-label="Send">
            <IconSend />
          </button>
        </form>
      </footer>
    </div>
  );
}
