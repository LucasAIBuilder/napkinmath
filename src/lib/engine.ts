import { all, create, type MathJsStatic, type MathNode } from "mathjs";
import { preprocessLine } from "./preprocessor.js";

type CurrencyCode = "USD" | "EUR" | "GBP";

export type LineEval = {
  value: unknown | null;
  currencyCode: CurrencyCode | null;
  error: boolean;
  kind: "blank" | "comment" | "expr";
};

export type EvalOutput = {
  lineEvals: LineEval[];
  definedVars: Set<string>;
};

const math = create(all, {}) as MathJsStatic;

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function isAssignmentExpr(expr: string) {
  // Avoid treating comparisons like `a == 1` as assignments.
  const idx = expr.indexOf("=");
  if (idx === -1) return false;
  if (expr.includes("==") || expr.includes(">=") || expr.includes("<=") || expr.includes("!=")) return false;
  const lhs = expr.slice(0, idx).trim();
  return IDENT.test(lhs);
}

function normalizeAssignmentVar(expr: string) {
  const idx = expr.indexOf("=");
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1);
  return { varName: lhs.toLowerCase(), normalizedExpr: `${lhs.toLowerCase()} = ${rhs}` };
}

function rewriteKnownVarsToLower(expr: string, knownVars: Set<string>) {
  if (knownVars.size === 0) return expr;
  return expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (full, ident: string) => {
    const lowered = ident.toLowerCase();
    if (knownVars.has(lowered)) return lowered;
    return full;
  });
}

// "mixed" marks a sum of different currencies; it shows as a plain number.
type Inferred = CurrencyCode | null | "mixed";

function combine(a: Inferred, b: Inferred): Inferred {
  if (a === null) return b;
  if (b === null || a === b) return a;
  return "mixed";
}

// Functions whose result is in the same currency as their arguments.
const SAME_CURRENCY_FNS = new Set(["round", "ceil", "floor", "fix", "abs", "max", "min", "sum", "mean", "median"]);

// The currency a line's result carries, worked out from the names it references:
// sums keep a shared currency, money times or divided by a plain number stays money,
// and money divided by money (a ratio) is a plain number.
function currencyOfNode(node: MathNode, currencyOf: Map<string, CurrencyCode | null>): Inferred {
  const n = node as any;
  switch (node.type) {
    case "SymbolNode":
      return currencyOf.get(n.name) ?? null;
    case "ParenthesisNode":
      return currencyOfNode(n.content, currencyOf);
    case "AssignmentNode":
      return currencyOfNode(n.value, currencyOf);
    case "OperatorNode": {
      const [a, b] = (n.args as MathNode[]).map((arg) => currencyOfNode(arg, currencyOf));
      switch (n.fn) {
        case "add":
        case "subtract":
          return combine(a, b);
        case "unaryMinus":
        case "unaryPlus":
          return a;
        case "multiply":
          return a !== null && b !== null ? null : (a ?? b);
        case "divide":
          return b === null ? a : null;
        default:
          return null;
      }
    }
    case "FunctionNode":
      if (!SAME_CURRENCY_FNS.has(n.fn?.name)) return null;
      return (n.args as MathNode[]).map((arg) => currencyOfNode(arg, currencyOf)).reduce(combine, null);
    default:
      return null;
  }
}

function inferCurrency(
  explicit: CurrencyCode | null,
  node: MathNode,
  currencyOf: Map<string, CurrencyCode | null>,
): CurrencyCode | null {
  if (explicit) return explicit;
  const inferred = currencyOfNode(node, currencyOf);
  return inferred === "mixed" ? null : inferred;
}

function singleCurrency(codes: (CurrencyCode | null)[]): CurrencyCode | null {
  const found = new Set(codes.filter((c): c is CurrencyCode => c !== null));
  return found.size === 1 ? [...found][0] : null;
}

export function evaluateLines(lines: string[]): EvalOutput {
  const scope: Record<string, unknown> = {};
  const definedVars = new Set<string>();

  const lineEvals: LineEval[] = [];
  let previousNonEmptyValue: unknown | null = null;
  let subtotal = 0;
  // Currency of each name in scope (variables, lineN, total, __prev).
  const currencyOf = new Map<string, CurrencyCode | null>();
  let subtotalCurrencies: (CurrencyCode | null)[] = [];

  for (let i = 0; i < lines.length; i++) {
    const pre = preprocessLine(lines[i]);
    if (pre.kind === "blank") {
      lineEvals.push({ kind: "blank", value: null, currencyCode: null, error: false });
      continue;
    }
    if (pre.kind === "comment") {
      lineEvals.push({ kind: "comment", value: null, currencyCode: null, error: false });
      continue;
    }

    const preprocessed = pre.expr;
    scope.previous = previousNonEmptyValue;
    scope.prev = previousNonEmptyValue;
    // Avoid potential name collisions with mathjs built-ins by also providing a private alias.
    scope.__prev = previousNonEmptyValue;

    try {
      if (pre.isTotalLine) {
        const value = subtotal;
        const currencyCode = pre.currencyCode ?? singleCurrency(subtotalCurrencies);
        scope.total = value;
        lineEvals.push({ kind: "expr", value, currencyCode, error: false });
        previousNonEmptyValue = value;
        subtotal = 0;
        subtotalCurrencies = [];
        scope[`line${i + 1}`] = value;
        for (const name of ["total", "__prev", `line${i + 1}`]) currencyOf.set(name, currencyCode);
        continue;
      }

      let expr = rewriteKnownVarsToLower(preprocessed, definedVars);
      // Normalize prev/previous to a single internal symbol.
      expr = expr.replace(/\bprevious\b/gi, "__prev").replace(/\bprev\b/gi, "__prev");
      let isAssignment = isAssignmentExpr(expr);

      if (isAssignment) {
        const { varName, normalizedExpr } = normalizeAssignmentVar(expr);
        expr = rewriteKnownVarsToLower(normalizedExpr, definedVars);
        const node = math.parse(expr);
        const value = node.evaluate(scope);
        const currencyCode = typeof value === "number" ? inferCurrency(pre.currencyCode, node, currencyOf) : null;
        definedVars.add(varName);
        lineEvals.push({ kind: "expr", value, currencyCode, error: false });
        previousNonEmptyValue = value;
        scope[`line${i + 1}`] = value;
        for (const name of [varName, "__prev", `line${i + 1}`]) currencyOf.set(name, currencyCode);
        if (typeof value === "number" && Number.isFinite(value)) {
          subtotal += value;
          subtotalCurrencies.push(currencyCode);
        }
        continue;
      }

      const node = math.parse(expr);
      const value = node.evaluate(scope);
      const currencyCode = typeof value === "number" ? inferCurrency(pre.currencyCode, node, currencyOf) : null;
      lineEvals.push({ kind: "expr", value, currencyCode, error: false });
      previousNonEmptyValue = value;
      scope[`line${i + 1}`] = value;
      for (const name of ["__prev", `line${i + 1}`]) currencyOf.set(name, currencyCode);

      if (typeof value === "number" && Number.isFinite(value)) {
        subtotal += value;
        subtotalCurrencies.push(currencyCode);
      }
    } catch {
      lineEvals.push({ kind: "expr", value: null, currencyCode: pre.currencyCode, error: true });
      // Keep `previous` stable on errors.
    }
  }

  return { lineEvals, definedVars };
}
