import type { LineEval } from "./engine";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const KEYWORDS = new Set(["total", "of", "to", "in", "previous", "prev"]);
const OPERATORS = /^[+\-*\/^=()]+$/;

function wrap(cls: string, text: string) {
  return `<span style="${cls}">${text}</span>`;
}

const CLS = {
  comment: "color:var(--nm-syn-comment);font-style:italic",
  operator: "color:var(--nm-syn-operator)",
  number: "color:var(--nm-syn-number)",
  varRef: "color:var(--nm-syn-variable)",
  keyword: "color:var(--nm-syn-keyword);font-weight:500",
  ident: "color:var(--nm-syn-ident)",
  error: "text-decoration:underline;text-decoration-color:var(--nm-syn-error);text-underline-offset:4px",
} as const;

function highlightLine(raw: string, definedVars: Set<string>) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return wrap(CLS.comment, escapeHtml(raw));
  }

  const safe = escapeHtml(raw);
  const tokens = safe.split(/(\s+|[()=+\-*\/^])/g).filter((t) => t.length > 0);
  const out: string[] = [];

  let sawEquals = false;
  for (const t of tokens) {
    if (/^\s+$/.test(t)) {
      out.push(t);
      continue;
    }
    if (t === "=") {
      sawEquals = true;
      out.push(wrap(CLS.operator, t));
      continue;
    }

    const lower = t.toLowerCase();
    if (!sawEquals && definedVars.has(lower) && /^[a-zA-Z_][\w]*$/.test(t)) {
      out.push(wrap(CLS.varRef, t));
      continue;
    }
    if (KEYWORDS.has(lower)) {
      out.push(wrap(CLS.keyword, t));
      continue;
    }
    if (OPERATORS.test(t)) {
      out.push(wrap(CLS.operator, t));
      continue;
    }
    if (/^-?\d+(?:\.\d+)?%?$/.test(t)) {
      out.push(wrap(CLS.number, t));
      continue;
    }
    if (/^[€£$]/.test(t)) {
      out.push(wrap(CLS.number, t));
      continue;
    }
    if (!sawEquals && /^[a-zA-Z_][\w]*$/.test(t)) {
      out.push(wrap(CLS.ident, t));
      continue;
    }
    out.push(t);
  }

  return out.join("");
}

export function highlightText(text: string, definedVars: Set<string>, lineEvals: LineEval[]) {
  const lines = text.split("\n");
  const htmlLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineHtml = highlightLine(lines[i], definedVars);
    const evalInfo = lineEvals[i];
    if (evalInfo?.error) {
      htmlLines.push(
        `<span style="${CLS.error}">${lineHtml || "&nbsp;"}</span>`,
      );
    } else {
      htmlLines.push(lineHtml || "&nbsp;");
    }
  }
  return htmlLines.join("\n");
}
