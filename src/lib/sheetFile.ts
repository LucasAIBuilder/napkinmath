// Sheet backup files (.napkin): build, parse and validate them, and merge imported sheets into the current ones.

export type SheetRecord = {
  id: string;
  name: string;
  emoji: string;
  content: string;
  updatedAt: number;
};

export const BACKUP_APP = "napkinmath";
export const BACKUP_VERSION = 1;
// localStorage holds about 5 MB, so a bigger file cannot fit anyway.
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type ParseResult = { ok: true; sheets: SheetRecord[] } | { ok: false; error: string };

export type MergeResult = { sheets: SheetRecord[]; added: number; updated: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** `napkinmath-YYYY-MM-DD.napkin`, in local time. */
export function backupFileName(date: Date) {
  return `napkinmath-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.napkin`;
}

/** Pretty-printed backup JSON for all sheets. */
export function buildBackup(sheets: SheetRecord[], exportedAt: number) {
  const data = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    sheets: sheets.map(({ id, name, emoji, content, updatedAt }) => ({ id, name, emoji, content, updatedAt })),
  };
  return JSON.stringify(data, null, 2) + "\n";
}

function isSheet(v: unknown): v is SheetRecord {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    s.id.length > 0 &&
    typeof s.name === "string" &&
    typeof s.emoji === "string" &&
    typeof s.content === "string" &&
    typeof s.updatedAt === "number" &&
    Number.isFinite(s.updatedAt)
  );
}

/** Reads a backup file. Any problem rejects the whole file, so a bad file changes nothing. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: "This file is too large to import." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "This is not a NapkinMath backup file." };
  }
  if (!data || typeof data !== "object" || (data as Record<string, unknown>).app !== BACKUP_APP) {
    return { ok: false, error: "This is not a NapkinMath backup file." };
  }
  const { version, sheets } = data as Record<string, unknown>;
  if (typeof version !== "number" || version < 1) return { ok: false, error: "This backup file is damaged." };
  if (version > BACKUP_VERSION) return { ok: false, error: "This backup is from a newer NapkinMath. Update the app first." };
  if (!Array.isArray(sheets) || !sheets.every(isSheet)) return { ok: false, error: "This backup file is damaged." };
  if (!sheets.length) return { ok: false, error: "This backup has no sheets." };
  return {
    ok: true,
    sheets: sheets.map(({ id, name, emoji, content, updatedAt }) => ({ id, name, emoji, content, updatedAt })),
  };
}

/**
 * Adds imported sheets after the current ones and never removes any. For a shared id the copy with the newer
 * updatedAt wins, in place; an equal or older imported copy is ignored.
 */
export function mergeSheets(current: SheetRecord[], incoming: SheetRecord[]): MergeResult {
  const sheets = [...current];
  const index = new Map(sheets.map((s, i) => [s.id, i]));
  let added = 0;
  let updated = 0;
  for (const s of incoming) {
    const i = index.get(s.id);
    if (i === undefined) {
      index.set(s.id, sheets.length);
      sheets.push(s);
      added++;
    } else if (s.updatedAt > sheets[i].updatedAt) {
      // A sheet added earlier from this same file is replaced, not counted twice.
      if (i < current.length && sheets[i] === current[i]) updated++;
      sheets[i] = s;
    }
  }
  return { sheets, added, updated };
}

const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** A file name for one sheet's text: no path or reserved characters, at most 100 characters, never empty. */
export function sheetFileName(name: string) {
  let base = name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .trim();
  base = Array.from(base).slice(0, 100).join("").trim();
  if (!base) base = "Untitled";
  if (RESERVED_WINDOWS_NAMES.test(base)) base = `${base} sheet`;
  return `${base}.txt`;
}
