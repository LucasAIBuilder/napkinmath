import { describe, expect, it } from "vitest";
import { formatResult } from "../../src/lib/formatter";
import { evaluateLines } from "../../src/lib/engine";

const plain = (v: unknown) => formatResult(v, { currencyCode: null });
const usd = (v: unknown) => formatResult(v, { currencyCode: "USD" });

describe("plain numbers", () => {
  it("groups thousands and keeps up to six decimals", () => {
    expect(plain(0)).toBe("0");
    expect(plain(1500)).toBe("1,500");
    expect(plain(1234.5678912)).toBe("1,234.567891");
    expect(plain(-0.5)).toBe("-0.5");
  });

  it("abbreviates millions, billions and trillions", () => {
    expect(plain(12_345_678)).toBe("12.3M");
    expect(plain(1_500_000_000)).toBe("1.50B");
    expect(plain(-2_500_000)).toBe("-2.50M");
    expect(plain(999e12)).toBe("999.0T");
  });

  it("switches to scientific notation at 1e15 and below 1e-6", () => {
    expect(plain(1e15)).toBe("1e15");
    expect(plain(5.04e27)).toBe("5.04e27");
    expect(plain(-5.04e27)).toBe("-5.04e27");
    expect(plain(1.2e-7)).toBe("1.2e-7");
    expect(plain(-1.2e-7)).toBe("-1.2e-7");
    expect(plain(1e-6)).toBe("0.000001");
  });
});

describe("currency", () => {
  it("uses two decimals and the currency symbol", () => {
    expect(usd(1234.567)).toBe("$1,234.57");
    expect(usd(-0.5)).toBe("-$0.50");
    expect(formatResult(12, { currencyCode: "EUR" })).toBe("€12.00");
    expect(formatResult(12, { currencyCode: "GBP" })).toBe("£12.00");
  });

  it("does not abbreviate large amounts below 1e15", () => {
    expect(usd(2_500_000)).toBe("$2,500,000.00");
    expect(usd(999e12)).toBe("$999,000,000,000,000.00");
  });

  it("uses scientific notation only for huge amounts, keeping the sign before the symbol", () => {
    expect(usd(1e15)).toBe("$1e15");
    expect(usd(-3.6e15)).toBe("-$3.6e15");
    expect(formatResult(5.04e27, { currencyCode: "GBP" })).toBe("£5.04e27");
  });

  it("rounds tiny amounts to zero instead of using scientific notation", () => {
    expect(usd(1.2e-7)).toBe("$0.00");
  });
});

describe("other values", () => {
  it("returns null for missing and non-finite values", () => {
    expect(plain(null)).toBeNull();
    expect(plain(undefined)).toBeNull();
    expect(plain(NaN)).toBeNull();
    expect(plain(Infinity)).toBeNull();
  });

  it("formats booleans and units", () => {
    expect(plain(true)).toBe("true");
    expect(plain(false)).toBe("false");
    const unit = evaluateLines(["1234.5 m to m"]).lineEvals[0].value;
    expect(plain(unit)).toBe("1,234.5 m");
  });

  it("rounds unit results to 2 decimals, keeping 3 significant digits below 1", () => {
    const values = evaluateLines(["160 cm to ft", "1 inch to km", "0.12345 m to m", "2 hours to minutes"]).lineEvals.map(
      (le) => le.value,
    );
    expect(values.map(plain)).toEqual(["5.25 ft", "0.0000254 km", "0.123 m", "120 minute"]);
    const negative = evaluateLines(["-160 cm to ft", "-0.12345 m to m"]).lineEvals.map((le) => le.value);
    expect(negative.map(plain)).toEqual(["-5.25 ft", "-0.123 m"]);
  });

  it("formats very large and very small unit values like plain numbers", () => {
    const values = evaluateLines(["1500000 m to m", "-1500000 m to m", "0.0005 m to m", "1 um to km"]).lineEvals.map(
      (le) => le.value,
    );
    // mathjs writes these as 1.5e+6 m, -1.5e+6 m, 5e-4 m and 1e-9 km.
    expect(values.map(plain)).toEqual(["1.50M m", "-1.50M m", "0.0005 m", "1e-9 km"]);
  });
});
