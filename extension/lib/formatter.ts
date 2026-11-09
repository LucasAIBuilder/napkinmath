import type { Unit } from "mathjs";

export type FormatHint = {
  currencyCode: "USD" | "EUR" | "GBP" | null;
};

const currencyFormatters: Record<"USD" | "EUR" | "GBP", Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }),
  EUR: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }),
  GBP: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }),
};

const currencySymbols: Record<"USD" | "EUR" | "GBP", string> = { USD: "$", EUR: "€", GBP: "£" };

// Beyond these magnitudes the T suffix or 6 fraction digits stop being readable
// (e.g. "5040000000000000.0T", or "0" for 1e-7), so switch to scientific notation.
function needsScientific(abs: number) {
  return abs >= 1e15 || (abs > 0 && abs < 1e-6);
}

function formatScientific(value: number) {
  const [mantissa, exponent] = value.toExponential(2).split("e");
  const trimmed = mantissa.replace(/\.?0+$/, "");
  return `${trimmed}e${exponent.replace("+", "")}`;
}

function formatPlainNumber(value: number) {
  const abs = Math.abs(value);
  if (needsScientific(abs)) return formatScientific(value);
  if (abs >= 1_000_000) {
    const units = [
      { limit: 1_000_000_000_000, suffix: "T" },
      { limit: 1_000_000_000, suffix: "B" },
      { limit: 1_000_000, suffix: "M" },
    ] as const;
    for (const u of units) {
      if (abs >= u.limit) {
        const scaled = value / u.limit;
        const digits = Math.abs(scaled) >= 10 ? 1 : 2;
        return `${scaled.toFixed(digits)}${u.suffix}`;
      }
    }
  }

  const isInt = Number.isFinite(value) && Math.floor(value) === value;
  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: isInt ? 0 : 0,
    maximumFractionDigits: isInt ? 0 : 6,
  });
  return formatter.format(value);
}

// Unit conversions rarely need more than 2 decimals; small values keep 3 significant digits so they don't round to 0.
function formatUnitNumber(value: number) {
  const abs = Math.abs(value);
  if (needsScientific(abs) || abs >= 1_000_000) return formatPlainNumber(value);
  const options: Intl.NumberFormatOptions = abs >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 3 };
  return new Intl.NumberFormat("en-US", { useGrouping: true, ...options }).format(value);
}

function isUnit(value: unknown): value is Unit {
  return typeof value === "object" && value !== null && (value as any).isUnit === true;
}

export function formatResult(value: unknown, hint: FormatHint): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (hint.currencyCode) {
      if (Math.abs(value) >= 1e15) {
        const sign = value < 0 ? "-" : "";
        return `${sign}${currencySymbols[hint.currencyCode]}${formatScientific(Math.abs(value))}`;
      }
      return currencyFormatters[hint.currencyCode].format(value);
    }
    return formatPlainNumber(value);
  }
  if (isUnit(value)) {
    // `toString()` includes the unit; we format the numeric prefix if we can.
    const s = value.toString();
    const match = s.match(/^\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(.*)$/);
    if (!match) return s;
    const n = Number(match[1]);
    const unitSuffix = match[2];
    if (!Number.isFinite(n)) return s;
    return `${formatUnitNumber(n)}${unitSuffix}`;
  }
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
