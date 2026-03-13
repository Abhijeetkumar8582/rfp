"use client";

import { useState } from "react";
import AppShell from "../../components/AppShell";
import "../../css/dashboard.css";

const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    tag: "OpenAI",
    title: "OpenAI API",
    subtitle: "Chat and embeddings via OpenAI",
    description: "Use GPT-4o, GPT-4-turbo, or other models for RFP search and Intelligence Hub. Add your API key and choose a chat model plus an embedding model for semantic search and document understanding.",
  },
  {
    id: "gemini",
    label: "Gemini",
    tag: "Gemini",
    title: "Google Gemini API",
    subtitle: "Chat and embeddings via Google AI",
    description: "Connect to Gemini 1.5 Pro, Flash, or other Google models for conversation and embeddings. Configure base URL and key once to power search, uploads, and intelligence features across the app.",
  },
  {
    id: "claude",
    label: "Claude",
    tag: "Claude",
    title: "Anthropic Claude API",
    subtitle: "Chat and embeddings via Anthropic",
    description: "Use Claude 3.5 Sonnet, Opus, or other Claude models for chat and vector embeddings. Set your endpoint and authorization to enable RFP analysis, Q&A, and document processing.",
  },
];

const CHAT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "claude-3-5-sonnet-20241022",
  "claude-3-opus-20240229",
];

const EMBEDDING_MODELS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
  "text-embedding-v3",
];

const defaultConfig = () => ({
  baseUrl: "",
  authKey: "",
  chatModel: CHAT_MODELS[0],
  embeddingModel: EMBEDDING_MODELS[0],
});

export default function ApiConfigPage() {
  const [enabledProvider, setEnabledProvider] = useState(null);
  const [configs, setConfigs] = useState({
    openai: defaultConfig(),
    gemini: defaultConfig(),
    claude: defaultConfig(),
  });
  const [configModalProvider, setConfigModalProvider] = useState(null);

  const openConfigModal = (providerId) => {
    setEnabledProvider(providerId);
    setConfigModalProvider(providerId);
  };

  const closeConfigModal = () => setConfigModalProvider(null);

  const updateConfig = (providerId, field, value) => {
    setConfigs((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], [field]: value },
    }));
  };

  const handleSaveConfig = () => {
    closeConfigModal();
  };

  const currentConfig = configModalProvider ? configs[configModalProvider] : null;

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">API Configuration</h1>
          <div className="pageSub">Choose one provider and set base URL, key, and models</div>
        </div>
      </header>

      <section className="apiConfigSection">
        <p className="apiConfigHint">Select one provider below. Only the selected provider will be used for chat and embeddings.</p>
        <div className="apiConfigCards" role="radiogroup" aria-label="API provider selection">
          {PROVIDERS.map((p) => {
            const isSelected = enabledProvider === p.id;
            return (
              <div
                key={p.id}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${p.label} — ${p.title}`}
                tabIndex={0}
                className={`apiConfigCard ${isSelected ? "apiConfigCardSelected" : ""}`}
                onClick={() => openConfigModal(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openConfigModal(p.id);
                  }
                }}
              >
                <div className="apiConfigCardInner">
                  <div className="apiConfigCardHead">
                    <span className="apiConfigCardTag">{p.tag}</span>
                    <span className={`apiConfigRadioVisual ${isSelected ? "apiConfigRadioVisualSelected" : ""}`} aria-hidden>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 6 5 9 10 3" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="radio"
                      name="apiProvider"
                      checked={isSelected}
                      onChange={() => openConfigModal(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="apiConfigRadio"
                      aria-label={`Select ${p.label}`}
                    />
                  </div>
                  {isSelected && <span className="apiConfigSelectedBadge">Active</span>}
                  <h3 className="apiConfigCardTitle">{p.title}</h3>
                  <p className="apiConfigCardSubtitle">{p.subtitle}</p>
                  <p className="apiConfigCardDesc">{p.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {configModalProvider && (
        <div className="modalBackdrop" onClick={closeConfigModal}>
          <div
            className="modalCard apiConfigModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalTitle">
              Configure {PROVIDERS.find((x) => x.id === configModalProvider)?.label}
            </div>
            <div className="apiConfigForm">
              <div className="formField">
                <label className="formLabel">Base URL</label>
                <input
                  type="url"
                  className="formInput"
                  placeholder="https://api.openai.com/v1"
                  value={currentConfig?.baseUrl ?? ""}
                  onChange={(e) => updateConfig(configModalProvider, "baseUrl", e.target.value)}
                />
              </div>
              <div className="formField">
                <label className="formLabel">Authorization key</label>
                <input
                  type="password"
                  className="formInput"
                  placeholder="sk-..."
                  value={currentConfig?.authKey ?? ""}
                  onChange={(e) => updateConfig(configModalProvider, "authKey", e.target.value)}
                />
              </div>
              <div className="formField">
                <label className="formLabel">Chat model</label>
                <select
                  className="formInput formSelect"
                  value={currentConfig?.chatModel ?? CHAT_MODELS[0]}
                  onChange={(e) => updateConfig(configModalProvider, "chatModel", e.target.value)}
                >
                  {CHAT_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="formField">
                <label className="formLabel">Embedding model</label>
                <select
                  className="formInput formSelect"
                  value={currentConfig?.embeddingModel ?? EMBEDDING_MODELS[0]}
                  onChange={(e) => updateConfig(configModalProvider, "embeddingModel", e.target.value)}
                >
                  {EMBEDDING_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modalFooter">
              <button type="button" className="ghostBtn" onClick={closeConfigModal}>
                Cancel
              </button>
              <button type="button" className="primaryBtn primaryBtnBlue" onClick={handleSaveConfig}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
