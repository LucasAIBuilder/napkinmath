import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "./components/Editor";
import SheetSelector, { type Sheet } from "./components/SheetSelector";
import SheetTransfer, { download } from "./components/SheetTransfer";
import ThemePicker from "./components/ThemePicker";
import ThemeToggle from "./components/ThemeToggle";
import { track } from "./lib/analytics";
import { mergeSheets, sheetFileName } from "./lib/sheetFile";
import {
  applyTheme,
  getStoredScheme,
  getStoredMode,
  setStoredScheme,
  setStoredMode,
  SCHEME_MAP,
  type SchemeName,
  type ThemeMode,
} from "./lib/theme";

const LEGACY_TEXT_KEY = "napkinmath:text:v1";
const SHEETS_KEY = "napkinmath:sheets:v1";

type StoredSheets = {
  sheets: Sheet[];
  activeSheetId: string;
};

const DEFAULT_TEXT = [
  "# Monthly expenses",
  "rent = $1,500",
  "utilities = $200",
  "groceries = $400",
  "total",
  "total * 12",
  "",
  "salary = $85,000",
  "salary - line6",
  "",
  "# Weekend trip",
  "hotel = $240",
  "food = $90",
  "hotel + food",
].join("\n");

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadSheets(): StoredSheets {
  const raw = localStorage.getItem(SHEETS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredSheets;
      if (Array.isArray(parsed.sheets) && typeof parsed.activeSheetId === "string") {
        return parsed;
      }
    } catch {
      // fall through to migration
    }
  }

  // Migration path: legacy single-sheet key.
  const legacy = localStorage.getItem(LEGACY_TEXT_KEY);
  const first: Sheet = {
    id: genId(),
    name: "Untitled",
    emoji: "🧮",
    content: legacy ?? DEFAULT_TEXT,
    updatedAt: Date.now(),
  };
  const stored: StoredSheets = { sheets: [first], activeSheetId: first.id };
  localStorage.setItem(SHEETS_KEY, JSON.stringify(stored));
  return stored;
}

function saveSheets(next: StoredSheets) {
  localStorage.setItem(SHEETS_KEY, JSON.stringify(next));
}

export default function App() {
  const storedScheme = getStoredScheme();
  const storedMode = getStoredMode();
  const [scheme, setScheme] = useState<SchemeName>(storedScheme ?? "midnight");
  const [mode, setMode] = useState<ThemeMode>(storedMode ?? SCHEME_MAP[storedScheme ?? "midnight"].nativeMode);
  const [showPicker, setShowPicker] = useState(storedScheme === null);

  const initialSheets = useMemo(() => loadSheets(), []);
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets.sheets);
  const [activeSheetId, setActiveSheetId] = useState<string>(initialSheets.activeSheetId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSheetsOpen, setMobileSheetsOpen] = useState(false);

  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) ?? sheets[0] ?? null,
    [sheets, activeSheetId],
  );

  const [clearArmed, setClearArmed] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    applyTheme(scheme, mode);
  }, [scheme, mode]);

  useEffect(() => {
    // If active sheet was deleted, keep a valid selection.
    if (!activeSheet && sheets.length) {
      setActiveSheetId(sheets[0].id);
    }
  }, [activeSheet, sheets]);

  useEffect(() => {
    saveSheets({ sheets, activeSheetId });
  }, [sheets, activeSheetId]);

  useEffect(() => {
    if (!clearArmed) return;
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setClearArmed(false), 4000);
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    };
  }, [clearArmed]);

  // Esc key returns to picker from editor
  useEffect(() => {
    if (showPicker) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPicker(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPicker]);

  function selectScheme(s: SchemeName, m: ThemeMode) {
    setScheme(s);
    setMode(m);
    setStoredScheme(s);
    setStoredMode(m);
    applyTheme(s, m);
    setShowPicker(false);
  }

  function toggleMode() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    setStoredMode(next);
    applyTheme(scheme, next);
  }

  function setActiveContent(content: string) {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === activeSheetId
          ? {
              ...s,
              content,
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
  }

  function newSheet() {
    const now = Date.now();
    const s: Sheet = {
      id: genId(),
      name: "Untitled",
      emoji: "📄",
      content: "",
      updatedAt: now,
    };
    setSheets((prev) => [s, ...prev]);
    setActiveSheetId(s.id);
    setClearArmed(false);
    track({ name: "sheet_created" });
  }

  function renameSheet(id: string, name: string) {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)));
  }

  function emojiSheet(id: string, emoji: string) {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, emoji, updatedAt: Date.now() } : s)));
  }

  function deleteSheet(id: string) {
    setSheets((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (!next.length) {
        const s: Sheet = { id: genId(), name: "Untitled", emoji: "🧮", content: "", updatedAt: Date.now() };
        return [s];
      }
      return next;
    });
    setActiveSheetId((cur) => {
      if (cur !== id) return cur;
      const fallback = sheets.find((s) => s.id !== id) ?? null;
      return fallback?.id ?? cur;
    });
    setClearArmed(false);
  }

  // Imported sheets join the current ones; the active sheet changes only when there was none.
  function importSheets(incoming: Sheet[]) {
    const result = mergeSheets(sheets, incoming);
    setSheets(result.sheets);
    if (!sheets.length && result.sheets.length) setActiveSheetId(result.sheets[0].id);
    return { added: result.added, updated: result.updated };
  }

  function exportSheetText(id: string) {
    const s = sheets.find((x) => x.id === id);
    if (s) download(sheetFileName(s.name), s.content, "text/plain;charset=utf-8");
  }

  if (showPicker) {
    return (
      <ThemePicker
        currentScheme={scheme}
        currentMode={mode}
        onSelect={selectScheme}
        showIntro={storedScheme === null}
      />
    );
  }

  return (
    <div className="h-full" style={{ background: "var(--nm-bg)", color: "var(--nm-text)" }}>
      <header
        className="flex h-12 items-center justify-between px-5 font-sans"
        style={{ background: "var(--nm-header-bg)", borderBottom: "1px solid var(--nm-header-border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="nm-btn inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm sm:hidden"
            style={{ borderColor: "var(--nm-border)", color: "var(--nm-text-muted)" }}
            onClick={() => setMobileSheetsOpen(true)}
            aria-label="Open sheets"
          >
            ☰
          </button>

          <div className="nm-logo-mark">N</div>
          <span className="font-display text-base font-semibold tracking-tight" style={{ color: "var(--nm-text)" }}>
            NapkinMath
          </span>
        </div>
        <div className="flex items-center gap-2">
          {clearArmed && (
            <span className="text-xs font-medium" style={{ color: "var(--nm-syn-error)" }}>
              Clear all?
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (!clearArmed) {
                setClearArmed(true);
                return;
              }
              setActiveContent("");
              setClearArmed(false);
            }}
            className="nm-btn inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
            style={{
              background: clearArmed ? "var(--nm-syn-error)" : "transparent",
              borderColor: clearArmed ? "var(--nm-syn-error)" : "var(--nm-border)",
              color: clearArmed ? "#fff" : "var(--nm-text-muted)",
            }}
          >
            {clearArmed ? "Confirm" : "Clear"}
          </button>
          {clearArmed && (
            <button
              type="button"
              onClick={() => setClearArmed(false)}
              className="nm-btn inline-flex h-8 items-center rounded-md px-2 text-xs"
              style={{ color: "var(--nm-text-muted)" }}
            >
              Cancel
            </button>
          )}
          <ThemeToggle mode={mode} onToggle={toggleMode} />
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="nm-btn inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
            style={{
              borderColor: "var(--nm-border)",
              color: "var(--nm-text-muted)",
              background: "transparent",
            }}
          >
            <span className="font-mono text-sm">◐</span>
            <span className="hidden sm:inline">Theme</span>
          </button>
        </div>
      </header>

      <main className="h-[calc(100%-3rem)]">
        <div className="mx-auto flex h-full max-w-6xl overflow-hidden px-0 py-0 sm:px-5 sm:py-4">
          <SheetSelector
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSelect={(id) => {
              setActiveSheetId(id);
              setClearArmed(false);
            }}
            onNew={newSheet}
            onRename={renameSheet}
            onDelete={deleteSheet}
            onEmoji={emojiSheet}
            onExportText={exportSheetText}
            footerAction={
              <SheetTransfer
                sheets={sheets}
                onImport={importSheets}
                alignLeft={sidebarCollapsed}
                showLabel={!sidebarCollapsed}
              />
            }
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            mobileOpen={mobileSheetsOpen}
            setMobileOpen={setMobileSheetsOpen}
          />

          <div className="min-w-0 flex-1 px-3 py-4 sm:px-0 sm:py-0">
            <div className="h-full sm:pl-3">
              <Editor text={activeSheet?.content ?? ""} setText={setActiveContent} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
