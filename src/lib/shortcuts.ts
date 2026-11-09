// Editor shortcuts shared by the web app and the extension popup.

export type Edit = { text: string; caret: number };

// Hints use the modifier the platform's users press; the handlers accept both Ctrl and ⌘.
export const MOD_LABEL =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl+";

function replaceRange(text: string, start: number, end: number, insert: string) {
  return text.slice(0, start) + insert + text.slice(end);
}

function getLineBounds(text: string, pos: number) {
  const idx = Math.max(0, Math.min(text.length, pos));
  const start = text.lastIndexOf("\n", idx - 1) + 1;
  const endIdx = text.indexOf("\n", idx);
  const end = endIdx === -1 ? text.length : endIdx;
  return { start, end };
}

// Copies the caret's line below it, with the caret at the same column on the copy.
export function duplicateLine(text: string, pos: number): Edit {
  const { start, end } = getLineBounds(text, pos);
  const line = text.slice(start, end);
  const col = pos - start;
  const hasNewline = end < text.length && text[end] === "\n";
  const insertPos = hasNewline ? end + 1 : end;
  const insertText = hasNewline ? `${line}\n` : `\n${line}`;
  const newLineStart = insertPos + (hasNewline ? 0 : 1);
  return {
    text: replaceRange(text, insertPos, insertPos, insertText),
    caret: newLineStart + Math.min(col, line.length),
  };
}

// Adds or removes a `# ` (or `//`) comment marker after the line's indent, keeping the caret on the same text.
export function toggleComment(text: string, pos: number): Edit {
  const { start, end } = getLineBounds(text, pos);
  const line = text.slice(start, end);
  const trimmed = line.trimStart();
  const indent = " ".repeat(line.length - trimmed.length);
  let nextLine: string;
  if (trimmed.startsWith("#")) nextLine = indent + trimmed.replace(/^#\s?/, "");
  else if (trimmed.startsWith("//")) nextLine = indent + trimmed.replace(/^\/\/\s?/, "");
  else nextLine = `${indent}# ${trimmed}`;
  const markerAt = start + indent.length;
  const shift = nextLine.length - line.length;
  return {
    text: replaceRange(text, start, end, nextLine),
    caret: pos < markerAt ? pos : Math.max(markerAt, pos + shift),
  };
}
