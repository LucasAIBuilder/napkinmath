export type PreprocessResult =
  | { kind: "blank" }
  | { kind: "comment" }
  | {
      kind: "expr";
      expr: string;
      currencyCode: "USD" | "EUR" | "GBP" | null;
      isTotalLine: boolean;
    };

const UNIT_ALIASES: Record<string, string> = {
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  miles: "mile",
  kilometers: "km",
  kilometre: "km",
  kilometres: "km",
  fahrenheit: "degF",
  celsius: "degC",
  hours: "hour",
  minutes: "minute",
  seconds: "second",
  days: "day",
  weeks: "week",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripNumericCommas(input: string) {
  return input.replace(/(\d),(?=\d)/g, "$1");
}

function rewritePercentOf(input: string) {
  // `X% of Y` (X may be a number or variable identifier)
  return input.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?)\s*%\s+of\s+(.+)/gi,
    "(( $1 ) / 100) * ( $2 )",
  );
}

function rewritePercentAddSub(input: string) {
  // `Y + X%` or `Y - X%` (X may be a number or variable identifier)
  const match = input.match(/^\s*(.+?)\s*([+-])\s*([a-zA-Z_][\w]*|\d+(?:\.\d+)?)\s*%\s*$/i);
  if (!match) return input;
  const y = match[1];
  const op = match[2];
  const x = match[3];
  if (op === "+") return `( ${y} ) * ( 1 + ( (${x}) / 100 ) )`;
  return `( ${y} ) * ( 1 - ( (${x}) / 100 ) )`;
}

function rewriteBarePercentLiterals(input: string) {
  // Interpret bare percent literals as "percentage points", not fractions.
  // Example: `tax = 8.5%` becomes `tax = 8.5` so later `tax% of price` works as expected.
  return input.replace(/(\d+(?:\.\d+)?)\s*%/g, "$1");
}

function normalizeUnitAliases(input: string) {
  let s = input;
  for (const [from, to] of Object.entries(UNIT_ALIASES)) {
    s = s.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi"), to);
  }
  // `in` is often used as a synonym for `to` in conversions (e.g. `5 miles in km`)
  s = s.replace(/\s+in\s+/gi, " to ");
  return s;
}

function rewriteEnglishOperators(input: string) {
  let s = input;
  s = s.replace(/\bdivided\s+by\b/gi, "/");
  s = s.replace(/\bover\b/gi, "/");
  s = s.replace(/\bmultiplied\s+by\b/gi, "*");
  s = s.replace(/\btimes\b/gi, "*");
  s = s.replace(/\bplus\b/gi, "+");
  s = s.replace(/\bminus\b/gi, "-");
  return s;
}

export function preprocessLine(raw: string): PreprocessResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: "blank" };
  if (trimmed.startsWith("#") || trimmed.startsWith("//")) return { kind: "comment" };

  const isTotalLine = trimmed.toLowerCase() === "total";
  const currencySymbol = raw.match(/[$€£]/)?.[0] ?? null;
  const currencyCode =
    currencySymbol === "$"
      ? "USD"
      : currencySymbol === "€"
        ? "EUR"
        : currencySymbol === "£"
          ? "GBP"
          : null;

  let expr = raw;
  expr = stripNumericCommas(expr);
  expr = expr.replaceAll("$", "");
  expr = expr.replaceAll("€", "");
  expr = expr.replaceAll("£", "");
  expr = expr.replace(/^\s*what is\s+/i, "");
  expr = rewriteEnglishOperators(expr);
  expr = rewritePercentOf(expr);
  expr = rewritePercentAddSub(expr);
  expr = rewriteBarePercentLiterals(expr);
  expr = normalizeUnitAliases(expr);

  return { kind: "expr", expr, currencyCode, isTotalLine };
}
