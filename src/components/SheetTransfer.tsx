import { useEffect, useRef, useState } from "react";
import { backupFileName, buildBackup, parseBackup, type SheetRecord } from "../lib/sheetFile";

type Props = {
  sheets: SheetRecord[];
  /** Adds the imported sheets and returns how many were added and updated. */
  onImport: (incoming: SheetRecord[]) => { added: number; updated: number };
  /** Open the menu from the left edge (the collapsed sidebar is too narrow to open it leftwards). */
  alignLeft?: boolean;
  /** Show the "Backup" label beside the icon (the collapsed sidebar has room for the icon only). */
  showLabel?: boolean;
};

type Toast = { text: string; error: boolean };

export function download(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function importMessage(added: number, updated: number) {
  if (!added && !updated) return "No changes: these sheets are already here.";
  const parts = [];
  if (added) parts.push(`added ${plural(added, "sheet")}`);
  if (updated) parts.push(`updated ${plural(updated, "sheet")}`);
  const text = parts.join(", ");
  return text[0].toUpperCase() + text.slice(1) + ".";
}

// Sidebar footer menu for the whole workspace: back up all sheets, import a backup.
export default function SheetTransfer({ sheets, onImport, alignLeft = false, showLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function importFile(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setToast({ text: "Could not read this file.", error: true });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setToast({ text: parsed.error, error: true });
      return;
    }
    const { added, updated } = onImport(parsed.sheets);
    setToast({ text: importMessage(added, updated), error: false });
  }

  const item = "nm-btn flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "nm-btn inline-flex h-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium " +
          (showLabel ? "px-3" : "w-9")
        }
        style={{ borderColor: "var(--nm-border)", color: "var(--nm-text)" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Backup"
        title="Back up or import sheets"
      >
        {/* Archive box */}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="5" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="M10 12h4" />
        </svg>
        {showLabel && <span>Backup</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={"absolute bottom-full z-50 mb-1 min-w-52 rounded-lg border p-1 shadow-lg " + (alignLeft ? "left-0" : "right-0")}
          style={{ background: "var(--nm-bg-card)", borderColor: "var(--nm-border)", color: "var(--nm-text)" }}
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              download(backupFileName(new Date()), buildBackup(sheets, Date.now()), "application/json");
              setOpen(false);
            }}
          >
            Back up all sheets
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
          >
            Import sheets…
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".napkin,.json,application/json"
        className="hidden"
        data-testid="import-file"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void importFile(file);
        }}
      />

      {toast && (
        <div
          role={toast.error ? "alert" : "status"}
          className="fixed bottom-5 left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg"
          style={{
            background: "var(--nm-bg-card)",
            borderColor: toast.error ? "var(--nm-syn-error)" : "var(--nm-border)",
            color: toast.error ? "var(--nm-syn-error)" : "var(--nm-text)",
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
