import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { evaluateLines } from "./lib/engine";
import { formatResult } from "./lib/formatter";
import { highlightText } from "./lib/highlight";
import { duplicateLine, MOD_LABEL, toggleComment } from "./lib/shortcuts";

let measureCtx: CanvasRenderingContext2D | null = null;

// Typing scrolls a textarea only until the caret reaches its left edge (LibreWolf 146 not even past the padding),
// so text typed at a line start while scrolled right can stay hidden. When the caret sits in or past the left
// padding, scroll back to the line start if the caret then fits, otherwise far enough to show it with the padding.
function keepCaretInView(ta: HTMLTextAreaElement, paddingPx: number) {
  if (ta.scrollLeft === 0) return;
  const pos = ta.selectionEnd;
  const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
  const cs = getComputedStyle(ta);
  measureCtx ??= document.createElement("canvas").getContext("2d")!;
  measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
  // Canvas draws a tab as one space; expand tabs to the textarea's tab stops first.
  const tabSize = parseInt(cs.tabSize) || 8;
  let prefix = "";
  for (const ch of ta.value.slice(lineStart, pos)) prefix += ch === "\t" ? " ".repeat(tabSize - (prefix.length % tabSize)) : ch;
  const caretX = paddingPx + measureCtx.measureText(prefix).width;
  if (caretX - ta.scrollLeft > paddingPx + 1) return;
  ta.scrollLeft = caretX + paddingPx <= ta.clientWidth ? 0 : caretX - paddingPx;
}

const STORAGE_KEY = "napkinmath_extension_text";

const DEFAULT_TEXT = [
  "rent = 1500",
  "utilities = 200",
  "groceries = 400",
  "",
  "# Monthly expenses",
  "rent + utilities + groceries",
  "total",
  "total * 12",
].join("\n");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getActiveLineIndex(text: string, selectionStart: number) {
  const idx = clamp(selectionStart, 0, text.length);
  let line = 0;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") line++;
  return line;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function storageGet(key: string): Promise<string | null> {
  try {
    const c = (globalThis as any).chrome;
    if (c?.storage?.local?.get) {
      const res = await c.storage.local.get([key]);
      return typeof res?.[key] === "string" ? res[key] : null;
    }
  } catch {
    // ignore
  }
  const v = localStorage.getItem(key);
  return typeof v === "string" ? v : null;
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    const c = (globalThis as any).chrome;
    if (c?.storage?.local?.set) {
      await c.storage.local.set({ [key]: value });
      return;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(key, value);
}

function App() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const resultsScrollRef = useRef<HTMLPreElement | null>(null);
  const gutterScrollRef = useRef<HTMLPreElement | null>(null);
  const activeHighlightRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef({ top: 0, left: 0, rafId: 0 });
  const pendingScrollRef = useRef<{ top: number; left: number } | null>(null);

  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [loaded, setLoaded] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [debouncedText, setDebouncedText] = useState(text);

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storageGet(STORAGE_KEY);
      if (cancelled) return;
      if (saved !== null) setText(saved);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // debounce evaluation/highlight
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedText(text), 50);
    return () => window.clearTimeout(t);
  }, [text]);

  // autosave (debounced)
  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      storageSet(STORAGE_KEY, text);
    }, 250);
    return () => window.clearTimeout(t);
  }, [text, loaded]);

  const liveLines = useMemo(() => text.split("\n"), [text]);
  const debouncedLines = useMemo(() => debouncedText.split("\n"), [debouncedText]);
  const { lineEvals, definedVars } = useMemo(() => evaluateLines(debouncedLines), [debouncedLines]);

  const results = useMemo(() => {
    const evaluated = lineEvals.map((le) => {
      if (le.kind !== "expr") return null;
      return formatResult(le.value, { currencyCode: le.currencyCode });
    });
    if (evaluated.length === liveLines.length) return evaluated;
    if (evaluated.length < liveLines.length) {
      return [...evaluated, ...Array.from({ length: liveLines.length - evaluated.length }, () => null)];
    }
    return evaluated.slice(0, liveLines.length);
  }, [lineEvals, liveLines.length]);

  const resultsHtml = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < liveLines.length; i++) {
      const value = results[i] ?? "";
      const isActive = i === activeLine;
      const color = isActive ? "var(--nm-result-active)" : "var(--nm-result-text)";
      const weight = isActive ? "500" : "400";
      lines.push(
        `<span style="color:${color};font-weight:${weight}">${value ? escapeHtml(value) : "&nbsp;"}</span>`,
      );
    }
    return lines.join("\n");
  }, [results, liveLines.length, activeLine]);

  const gutterHtml = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < liveLines.length; i++) {
      const isActive = i === activeLine;
      const color = isActive ? "var(--nm-gutter-active)" : "var(--nm-gutter-text)";
      const weight = isActive ? "500" : "400";
      lines.push(`<span style="color:${color};font-weight:${weight}">${i + 1}</span>`);
    }
    return lines.join("\n");
  }, [liveLines.length, activeLine]);

  const highlighted = useMemo(() => highlightText(text, definedVars, lineEvals), [text, definedVars, lineEvals]);

  const lineHeightPx = 30;
  const paddingTopPx = 14;
  const gutterWidthPx = 40;
  const leftPaddingPx = paddingTopPx + gutterWidthPx;

  function updateActiveHighlight() {
    const el = activeHighlightRef.current;
    if (!el) return;
    el.style.transform = `translateY(${paddingTopPx + activeLine * lineHeightPx - scrollRef.current.top}px)`;
  }

  function applyScroll(top: number, left: number) {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top;
      highlightRef.current.scrollLeft = left;
    }
    if (resultsScrollRef.current) resultsScrollRef.current.scrollTop = top;
    if (gutterScrollRef.current) gutterScrollRef.current.scrollTop = top;
    scrollRef.current.top = top;
    scrollRef.current.left = left;
    updateActiveHighlight();
  }

  function syncScroll() {
    const ta = textareaRef.current;
    if (!ta) return;
    pendingScrollRef.current = { top: ta.scrollTop, left: ta.scrollLeft };
    if (scrollRef.current.rafId) return;
    scrollRef.current.rafId = window.requestAnimationFrame(() => {
      scrollRef.current.rafId = 0;
      const pending = pendingScrollRef.current;
      if (!pending) return;
      applyScroll(pending.top, pending.left);
    });
  }

  function setCursor(pos: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.selectionStart = pos;
    ta.selectionEnd = pos;
    ta.focus();
    setActiveLine(getActiveLineIndex(ta.value, pos));
  }

  // Caret position for a shortcut's edit, applied in the same commit as the new text so a fast next keystroke
  // can't land at the end of the textarea, where the browser puts the caret when a controlled value changes.
  const pendingCaretRef = useRef<number | null>(null);

  function setTextAndCaret(nextText: string, pos: number) {
    if (nextText === text) {
      setCursor(pos);
      return;
    }
    pendingCaretRef.current = pos;
    setText(nextText);
  }

  useLayoutEffect(() => {
    if (pendingCaretRef.current === null) return;
    setCursor(pendingCaretRef.current);
    pendingCaretRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    syncScroll();
    updateActiveHighlight();
    return () => {
      if (scrollRef.current.rafId) {
        window.cancelAnimationFrame(scrollRef.current.rafId);
        scrollRef.current.rafId = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    applyScroll(ta.scrollTop, ta.scrollLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, activeLine, liveLines.length]);

  useEffect(() => {
    updateActiveHighlight();
  }, [activeLine]);

  return (
    <div className="nm-shell">
      <header className="nm-header">
        <div className="nm-title">
          <div className="nm-logo-mark">N</div>
          <div>NapkinMath</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="nm-btn"
            onClick={() => {
              setText("");
              window.setTimeout(() => setCursor(0), 0);
            }}
          >
            Clear
          </button>
        </div>
      </header>

      <main className="nm-main">
        <div className="nm-card nm-grid-bg">
          <div className="nm-grid">
            {/* editor */}
            <div
              style={{ position: "relative", overflow: "hidden" }}
              onWheel={(e) => {
                // Nothing scrollable sits under the line numbers, so pass wheel scrolling there on to the editor.
                if (e.target !== e.currentTarget) return;
                const ta = textareaRef.current;
                if (!ta) return;
                const unit = e.deltaMode === 1 ? lineHeightPx : e.deltaMode === 2 ? ta.clientHeight : 1;
                ta.scrollBy(e.deltaX * unit, e.deltaY * unit);
              }}
            >
              <pre
                ref={gutterScrollRef}
                aria-hidden="true"
                data-testid="gutter"
                className="nm-scrollbar-x-ghost"
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  zIndex: 20,
                  inset: "0 auto 0 0",
                  width: gutterWidthPx,
                  boxSizing: "border-box",
                  overflowX: "scroll",
                  overflowY: "hidden",
                  padding: `${paddingTopPx}px 8px`,
                  margin: 0,
                  background: "var(--nm-bg-gutter)",
                  borderRight: "1px solid var(--nm-border-subtle)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                  lineHeight: `${lineHeightPx}px`,
                  textAlign: "right",
                  userSelect: "none",
                }}
                dangerouslySetInnerHTML={{ __html: gutterHtml }}
              />

              <pre
                ref={highlightRef}
                aria-hidden="true"
                data-testid="highlight"
                className="nm-editor nm-scrollbar-x-ghost"
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  zIndex: 10,
                  inset: `0 0 0 ${gutterWidthPx}px`,
                  overflowX: "scroll",
                  overflowY: "auto",
                  padding: paddingTopPx,
                  margin: 0,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                  lineHeight: `${lineHeightPx}px`,
                  color: "var(--nm-text)",
                }}
              >
                <code style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  keepCaretInView(e.currentTarget, paddingTopPx);
                }}
                onScroll={syncScroll}
                onSelect={(e) => {
                  const ta = e.currentTarget;
                  setActiveLine(getActiveLineIndex(ta.value, ta.selectionStart ?? 0));
                }}
                onKeyDown={(e) => {
                  const ta = e.currentTarget;
                  const pos = ta.selectionStart ?? 0;
                  setActiveLine(getActiveLineIndex(ta.value, pos));

                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                    e.preventDefault();
                    storageSet(STORAGE_KEY, ta.value);
                    return;
                  }

                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
                    e.preventDefault();
                    const edit = duplicateLine(text, pos);
                    setTextAndCaret(edit.text, edit.caret);
                    return;
                  }

                  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
                    e.preventDefault();
                    const edit = toggleComment(text, pos);
                    setTextAndCaret(edit.text, edit.caret);
                    return;
                  }
                }}
                spellCheck={false}
                wrap="off"
                className="nm-editor nm-scrollbar-x"
                style={{
                  position: "absolute",
                  zIndex: 20,
                  // Start right of the gutter (not under it) so the browser keeps the caret out of the line numbers,
                  // and scroll fully back to column 0 rather than stopping with the caret at the gutter edge.
                  inset: `0 0 0 ${gutterWidthPx}px`,
                  boxSizing: "border-box",
                  resize: "none",
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  overflowX: "scroll",
                  overflowY: "auto",
                  padding: paddingTopPx,
                  scrollPaddingLeft: paddingTopPx,
                  margin: 0,
                  width: `calc(100% - ${gutterWidthPx}px)`,
                  height: "100%",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                  lineHeight: `${lineHeightPx}px`,
                  color: "transparent",
                  caretColor: "var(--nm-caret)",
                  WebkitTextFillColor: "transparent" as any,
                }}
              />

              <div style={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
                <div
                  ref={activeHighlightRef}
                  className="nm-active-line"
                  style={{
                    position: "absolute",
                    left: leftPaddingPx,
                    right: paddingTopPx,
                    height: lineHeightPx,
                  }}
                />
              </div>
            </div>

            {/* results */}
            <div className="nm-result-divider" style={{ overflow: "hidden", background: "var(--nm-bg-results)" }}>
              <pre
                ref={resultsScrollRef}
                aria-hidden="true"
                data-testid="results"
                className="nm-scrollbar-x"
                onScroll={(e) => {
                  // Wheel scrolling over the results drives the editor so rows stay aligned.
                  const ta = textareaRef.current;
                  const res = e.currentTarget;
                  if (!ta || ta.scrollTop === res.scrollTop) return;
                  ta.scrollTop = res.scrollTop;
                  // The results column can scroll a few px further than the editor; pull it back to match.
                  if (ta.scrollTop !== res.scrollTop) res.scrollTop = ta.scrollTop;
                }}
                style={{
                  height: "100%",
                  boxSizing: "border-box",
                  overflowX: "scroll",
                  overflowY: "auto",
                  padding: paddingTopPx,
                  margin: 0,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                  lineHeight: `${lineHeightPx}px`,
                  textAlign: "right",
                }}
                dangerouslySetInnerHTML={{ __html: resultsHtml }}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="nm-footer">
        <div>
          {MOD_LABEL}/ comment · {MOD_LABEL}D duplicate
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums" }}>Saved locally</div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
