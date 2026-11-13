import { useEffect, useRef, useState } from "react";
import {
  backupFileName,
  buildBackup,
  parseBackup,
  sheetFileName,
  type SheetRecord,
} from "../lib/sheetFile";

type Props = {
  sheets: SheetRecord[];
  activeSheet: SheetRecord | null;
  /** Adds the imported sheets and returns how many were added and updated. */
  onImport: (incoming: SheetRecord[]) => { added: number; updated: number };
  /** Open the menu from the left edge (the collapsed sidebar is too narrow to open it leftwards). */
  alignLeft?: boolean;
};

type Toast = { text: string; error: boolean };

function download(fileName: string, text: string, type: string) {
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

// Sidebar footer menu: back up all sheets, export the current sheet as text, import a backup.
export default function SheetTransfer({ sheets, activeSheet, onImport, alignLeft = false }: Props) {
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
        className="nm-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm"
        style={{ borderColor: "var(--nm-border)", color: "var(--nm-text)" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Back up, export or import sheets"
        title="Back up, export or import sheets"
      >
        ⇅
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
            disabled={!activeSheet}
            onClick={() => {
              if (activeSheet) download(sheetFileName(activeSheet.name), activeSheet.content, "text/plain;charset=utf-8");
              setOpen(false);
            }}
          >
            Export this sheet as text
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
