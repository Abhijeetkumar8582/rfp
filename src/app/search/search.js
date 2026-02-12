"use client";

import React, { useState } from "react";
import "../css/SearchSection.css";

const SAMPLE_RESPONSES = [
  {
    intro: "Sure, here is a sci-fi beginning in Ted Chiang's style (version 1):",
    body: "The year is 2042. Humanity has finally achieved interstellar travel, but it has come at a price. The journey to the nearest star system takes decades, and the only way to survive the voyage is to place people in cryogenic sleep.\n\nOne such cryonaut is a young woman named Anya. She is awakened from her sleep after 20 years to find that the world she left behind is no longer the same. The climate has changed drastically, and the global economy has collapsed.\n\nAnya is determined to find a way to help her fellow cryonauts adjust to this new world, but she soon realizes that the challenges they face are far greater than she could have imagined.",
    commentary:
      "This beginning is in Ted Chiang's style in a few ways. First, it is set in the near future, which is a common setting for Chiang's stories. Second, it introduces a scientific concept that is both plausible and thought-provoking: the idea of interstellar travel through cryogenic sleep. Third, it raises a moral dilemma: what is the right thing to do when you wake up in a world that is very different from the one you left behind? I hope you like it!",
  },
  {
    intro: "Sure, here is a sci-fi beginning in Ted Chiang's style (version 2):",
    body: "The first message from Tau Ceti arrived on a Tuesday. It was not a voice, not an image—just a string of prime numbers, repeating in a pattern that could not have been natural.\n\nDr. Elena Vasquez had spent twenty years waiting for this. She had given up tenure, family, the certainty of gravity. Now, in the sterile quiet of the listening station, she watched the numbers scroll across the screen and wondered what she was supposed to feel.",
    commentary:
      "Version 2 leans into Chiang's love of mathematical elegance and first contact. The tone is more restrained and observational, with a focus on the emotional weight of discovery rather than world-building.",
  },
  {
    intro: "Sure, here is a sci-fi beginning in Ted Chiang's style (version 3):",
    body: "They called it the Memory Market. For a fee, you could borrow someone else's childhood—not the facts of it, but the feel: the smell of rain on hot pavement, the weight of a hand on your shoulder, the exact shade of blue that meant safety.\n\nMaya had sold hers at eighteen. She had needed the money. Now, at forty-two, she was buying it back, piece by piece, and finding that the person who had lived those years was not quite her.",
    commentary:
      "Version 3 focuses on identity and memory, themes Chiang often explores. The speculative element is subtle and personal, with a near-future setting that feels intimate rather than epic.",
  },
];

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
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [responses] = useState(SAMPLE_RESPONSES);
  const [versionIndex, setVersionIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const current = responses[versionIndex];
  const canPrev = versionIndex > 0;
  const canNext = versionIndex < responses.length - 1;

  function handleSubmit(e) {
    e?.preventDefault();
    const q = (query || "").trim();
    if (!q) return;
    setSubmittedQuery(q);
    setHasSearched(true);
    setVersionIndex(0);
  }

  function handleCopy() {
    const text = [current.intro, current.body, current.commentary].join("\n\n");
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className="searchPageBard">
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

        {/* Main: AI response */}
        {hasSearched && current && (
          <section className="searchBardResponse">
            <div className="searchBardResponseInner">
              <div className="searchBardResponseAvatar">
                <IconStar />
              </div>
              <div className="searchBardResponseBody">
                <div className="searchBardIntro">
                  <span>{current.intro.replace(/\(version \d+\)\.?$/, "").trim()}</span>
                  <button
                    type="button"
                    className="searchBardVersionLink"
                    onClick={() => setVersionIndex((v) => (v + 1) % responses.length)}
                  >
                    (version {versionIndex + 1})
                  </button>
                  <span className="searchBardIntroTrail">.</span>
                  <button type="button" className="searchBardSpeaker" aria-label="Listen">
                    <IconSpeaker />
                  </button>
                </div>
                <div className="searchBardTextBlock">
                  <button
                    type="button"
                    className="searchBardNav searchBardNavLeft"
                    aria-label="Previous version"
                    disabled={!canPrev}
                    onClick={() => setVersionIndex((i) => i - 1)}
                  >
                    <IconChevronLeft />
                  </button>
                  <div className="searchBardParagraphs">
                    {current.body.split("\n\n").map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="searchBardNav searchBardNavRight"
                    aria-label="Next version"
                    disabled={!canNext}
                    onClick={() => setVersionIndex((i) => i + 1)}
                  >
                    <IconChevronRight />
                  </button>
                </div>
                <p className="searchBardCommentary">{current.commentary}</p>
                <div className="searchBardActions">
                  <button type="button" className="searchBardActionBtn" onClick={handleCopy} title="Copy">
                    <IconCopy />
                  </button>
                  <button type="button" className="searchBardActionBtn" title="Regenerate">
                    <IconRegenerate />
                  </button>
                  <button type="button" className="searchBardActionBtn" title="Fact check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <text x="6" y="17" fontSize="14" fontWeight="700" fontFamily="sans-serif">G</text>
                    </svg>
                  </button>
                  <button type="button" className="searchBardActionBtn" title="More options">
                    <IconMore />
                  </button>
                </div>
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
            <p className="searchBardEmptyText">Ask anything. Try &quot;Write three versions of a sci-fi beginning in Ted Chiang&apos;s style.&quot;</p>
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
