"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { apiCredentials } from "../../../lib/api";
import "../../css/dashboard.css";
import "../../css/settingapi.css";

const defaultGroup = () => ({
  baseUrl: "",
  apiKey: "",
  model: "",
});

export default function ApiConfigurationPage() {
  const [openaiOpen, setOpenaiOpen] = useState(false);
  const [chat, setChat] = useState(defaultGroup);
  const [embedding, setEmbedding] = useState(defaultGroup);
  const [ocr, setOcr] = useState(defaultGroup);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [baseline, setBaseline] = useState({ chat: defaultGroup(), embedding: defaultGroup(), ocr: defaultGroup() });
  const [testState, setTestState] = useState({
    chat: { status: "idle", message: "" },
    embedding: { status: "idle", message: "" },
    ocr: { status: "idle", message: "" },
  });
  const [keyDrafts, setKeyDrafts] = useState({ chat: "", embedding: "", ocr: "" });
  const [editKey, setEditKey] = useState({ chat: false, embedding: false, ocr: false });

  useEffect(() => {
    document.title = "API Configuration";
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const data = await apiCredentials.getOpenAI();
        if (!mounted) return;
        const next = {
          chat: data?.chat || defaultGroup(),
          embedding: data?.embedding || defaultGroup(),
          ocr: data?.ocr || defaultGroup(),
        };
        setChat(next.chat);
        setEmbedding(next.embedding);
        setOcr(next.ocr);
        setBaseline(next);
        setSaved(false);
      } catch (e) {
        if (!mounted) return;
        setLoadError(e?.message || "Failed to load API settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const allOk = ["chat", "embedding", "ocr"].every((k) => testState[k]?.status === "ok");
    if (!allOk) {
      setLoadError("Please test Chat, Embedding, and OCR successfully before saving.");
      return;
    }
    (async () => {
      try {
        setLoadError("");
        const body = {
          chat: { ...chat, apiKey: (keyDrafts.chat || "").trim() || chat.apiKey || "" },
          embedding: { ...embedding, apiKey: (keyDrafts.embedding || "").trim() || embedding.apiKey || "" },
          ocr: { ...ocr, apiKey: (keyDrafts.ocr || "").trim() || ocr.apiKey || "" },
        };
        await apiCredentials.saveOpenAI(body);
        const next = { chat: body.chat, embedding: body.embedding, ocr: body.ocr };
        setBaseline(next);
        setSaved(true);
        setOpenaiOpen(false);
        setKeyDrafts({ chat: "", embedding: "", ocr: "" });
        setEditKey({ chat: false, embedding: false, ocr: false });
      } catch (err) {
        setLoadError(err?.message || "Failed to save API settings.");
      }
    })();
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChat(baseline.chat || defaultGroup());
    setEmbedding(baseline.embedding || defaultGroup());
    setOcr(baseline.ocr || defaultGroup());
    setOpenaiOpen(false);
    setKeyDrafts({ chat: "", embedding: "", ocr: "" });
    setEditKey({ chat: false, embedding: false, ocr: false });
  };

  const setTest = (key, patch) => {
    setTestState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const runTest = async (key) => {
    try {
      setLoadError("");
      setTest(key, { status: "running", message: "Testing..." });
      let res;
      const draftKey = (keyDrafts[key] || "").trim();
      if (key === "chat") res = await apiCredentials.testOpenAIChat({ ...chat, apiKey: draftKey || chat.apiKey || "" });
      else if (key === "embedding") res = await apiCredentials.testOpenAIEmbedding({ ...embedding, apiKey: draftKey || embedding.apiKey || "" });
      else res = await apiCredentials.testOpenAIOcr({ ...ocr, apiKey: draftKey || ocr.apiKey || "" });

      if (res?.ok) {
        const msg = `${res.message || "OK"}${res.latency_ms != null ? ` (${res.latency_ms}ms)` : ""}`;
        setTest(key, { status: "ok", message: msg });
      } else {
        const msg = `${res?.message || "Failed"}${res?.status_code ? ` (HTTP ${res.status_code})` : ""}`;
        setTest(key, { status: "fail", message: msg });
      }
    } catch (e) {
      setTest(key, { status: "fail", message: e?.message || "Test failed" });
    }
  };

  const updateGroup = (setter, field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  // Reset test status when user changes inputs (forces re-test before save)
  useEffect(() => setTest("chat", { status: "idle", message: "" }), [chat.baseUrl, chat.apiKey, chat.model]);
  useEffect(() => setTest("embedding", { status: "idle", message: "" }), [embedding.baseUrl, embedding.apiKey, embedding.model]);
  useEffect(() => setTest("ocr", { status: "idle", message: "" }), [ocr.baseUrl, ocr.apiKey, ocr.model]);
  useEffect(() => setTest("chat", { status: "idle", message: "" }), [keyDrafts.chat]);
  useEffect(() => setTest("embedding", { status: "idle", message: "" }), [keyDrafts.embedding]);
  useEffect(() => setTest("ocr", { status: "idle", message: "" }), [keyDrafts.ocr]);

  return (
    <AppShell>
      <header className="headerRow">
        <div>
          <h1 className="pageTitle">API Configuration</h1>
          <div className="pageSub">Configure API providers and keys for the platform.</div>
        </div>
      </header>

      <section className="panel apiConfigSection">
        <p className="apiConfigHint">
          Configure providers and credentials here.
          {loading ? " Loading…" : ""}
        </p>
        {loadError ? (
          <div className="apiSettingsError" role="alert">
            {loadError}
          </div>
        ) : null}

        <div className={`apiOpenaiCard ${openaiOpen ? "apiOpenaiCardOpen" : ""}`}>
          <div
            className="apiOpenaiHeader"
            onClick={() => setOpenaiOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenaiOpen((prev) => !prev);
              }
            }}
          >
            <span className="apiOpenaiTitle">OpenAI</span>
            {saved && <span className="apiOpenaiSaved">Saved</span>}
            <span className="apiOpenaiChevron" aria-hidden>{openaiOpen ? "▼" : "▶"}</span>
          </div>

          {openaiOpen && (
            <div className="apiOpenaiBody" onClick={(e) => e.stopPropagation()}>
              <form className="apiOpenaiForm" onSubmit={handleSave}>
                {/* Header Chat */}
                <fieldset className="apiOpenaiFieldset">
                  <div className="apiLegendRow">
                    <legend className="apiOpenaiLegend">Header Chat</legend>
                    <button
                      type="button"
                      className="ghostBtn apiTestBtn"
                      onClick={() => runTest("chat")}
                      disabled={testState.chat.status === "running"}
                    >
                      {testState.chat.status === "running" ? "Testing..." : "Test"}
                    </button>
                  </div>
                  <div className={`apiTestStatus apiTestStatus_${testState.chat.status}`}>
                    {testState.chat.status === "idle" ? "Not tested" : testState.chat.message}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="chat-baseUrl">Base URL</label>
                    <input
                      id="chat-baseUrl"
                      type="url"
                      className="formInput"
                      placeholder="https://api.openai.com/v1"
                      value={chat.baseUrl}
                      onChange={(e) => updateGroup(setChat, "baseUrl", e.target.value)}
                    />
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="chat-apiKey">API Key</label>
                    <input
                      id="chat-apiKey"
                      type="text"
                      className="formInput"
                      placeholder="abc…xyz"
                      value={chat.apiKey}
                      readOnly
                    />
                    <div className="apiKeyRow">
                      <button
                        type="button"
                        className="ghostBtn apiKeyEditBtn"
                        onClick={() => setEditKey((p) => ({ ...p, chat: !p.chat }))}
                      >
                        {editKey.chat ? "Cancel update" : "Update key"}
                      </button>
                    </div>
                    {editKey.chat ? (
                      <input
                        type="password"
                        className="formInput apiKeyNewInput"
                        placeholder="Enter new API key"
                        value={keyDrafts.chat}
                        onChange={(e) => setKeyDrafts((p) => ({ ...p, chat: e.target.value }))}
                      />
                    ) : null}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="chat-model">Model</label>
                    <input
                      id="chat-model"
                      type="text"
                      className="formInput"
                      placeholder="gpt-4o"
                      value={chat.model}
                      onChange={(e) => updateGroup(setChat, "model", e.target.value)}
                    />
                  </div>
                </fieldset>

                {/* Embedding */}
                <fieldset className="apiOpenaiFieldset">
                  <div className="apiLegendRow">
                    <legend className="apiOpenaiLegend">Embedding</legend>
                    <button
                      type="button"
                      className="ghostBtn apiTestBtn"
                      onClick={() => runTest("embedding")}
                      disabled={testState.embedding.status === "running"}
                    >
                      {testState.embedding.status === "running" ? "Testing..." : "Test"}
                    </button>
                  </div>
                  <div className={`apiTestStatus apiTestStatus_${testState.embedding.status}`}>
                    {testState.embedding.status === "idle" ? "Not tested" : testState.embedding.message}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="embedding-baseUrl">Base URL</label>
                    <input
                      id="embedding-baseUrl"
                      type="url"
                      className="formInput"
                      placeholder="https://api.openai.com/v1"
                      value={embedding.baseUrl}
                      onChange={(e) => updateGroup(setEmbedding, "baseUrl", e.target.value)}
                    />
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="embedding-apiKey">API Key</label>
                    <input
                      id="embedding-apiKey"
                      type="text"
                      className="formInput"
                      placeholder="abc…xyz"
                      value={embedding.apiKey}
                      readOnly
                    />
                    <div className="apiKeyRow">
                      <button
                        type="button"
                        className="ghostBtn apiKeyEditBtn"
                        onClick={() => setEditKey((p) => ({ ...p, embedding: !p.embedding }))}
                      >
                        {editKey.embedding ? "Cancel update" : "Update key"}
                      </button>
                    </div>
                    {editKey.embedding ? (
                      <input
                        type="password"
                        className="formInput apiKeyNewInput"
                        placeholder="Enter new API key"
                        value={keyDrafts.embedding}
                        onChange={(e) => setKeyDrafts((p) => ({ ...p, embedding: e.target.value }))}
                      />
                    ) : null}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="embedding-model">Model</label>
                    <input
                      id="embedding-model"
                      type="text"
                      className="formInput"
                      placeholder="text-embedding-3-small"
                      value={embedding.model}
                      onChange={(e) => updateGroup(setEmbedding, "model", e.target.value)}
                    />
                  </div>
                </fieldset>

                {/* OCR */}
                <fieldset className="apiOpenaiFieldset">
                  <div className="apiLegendRow">
                    <legend className="apiOpenaiLegend">OCR</legend>
                    <button
                      type="button"
                      className="ghostBtn apiTestBtn"
                      onClick={() => runTest("ocr")}
                      disabled={testState.ocr.status === "running"}
                    >
                      {testState.ocr.status === "running" ? "Testing..." : "Test"}
                    </button>
                  </div>
                  <div className={`apiTestStatus apiTestStatus_${testState.ocr.status}`}>
                    {testState.ocr.status === "idle" ? "Not tested" : testState.ocr.message}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="ocr-baseUrl">Base URL</label>
                    <input
                      id="ocr-baseUrl"
                      type="url"
                      className="formInput"
                      placeholder="https://api.openai.com/v1"
                      value={ocr.baseUrl}
                      onChange={(e) => updateGroup(setOcr, "baseUrl", e.target.value)}
                    />
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="ocr-apiKey">API Key</label>
                    <input
                      id="ocr-apiKey"
                      type="text"
                      className="formInput"
                      placeholder="abc…xyz"
                      value={ocr.apiKey}
                      readOnly
                    />
                    <div className="apiKeyRow">
                      <button
                        type="button"
                        className="ghostBtn apiKeyEditBtn"
                        onClick={() => setEditKey((p) => ({ ...p, ocr: !p.ocr }))}
                      >
                        {editKey.ocr ? "Cancel update" : "Update key"}
                      </button>
                    </div>
                    {editKey.ocr ? (
                      <input
                        type="password"
                        className="formInput apiKeyNewInput"
                        placeholder="Enter new API key"
                        value={keyDrafts.ocr}
                        onChange={(e) => setKeyDrafts((p) => ({ ...p, ocr: e.target.value }))}
                      />
                    ) : null}
                  </div>
                  <div className="formField">
                    <label className="formLabel" htmlFor="ocr-model">Model</label>
                    <input
                      id="ocr-model"
                      type="text"
                      className="formInput"
                      placeholder="gpt-4o"
                      value={ocr.model}
                      onChange={(e) => updateGroup(setOcr, "model", e.target.value)}
                    />
                  </div>
                </fieldset>

                <div className="apiOpenaiActions">
                  <button type="button" className="ghostBtn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="primaryBtn primaryBtnBlue">
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
