import { describe, expect, it } from "vitest";
import { preprocessLine } from "../../src/lib/preprocessor";

function expr(line: string) {
  const out = preprocessLine(line);
  if (out.kind !== "expr") throw new Error(`expected an expression line, got ${out.kind}`);
  return out;
}

describe("preprocessLine", () => {
  it("detects blank and comment lines", () => {
    expect(preprocessLine("")).toEqual({ kind: "blank" });
    expect(preprocessLine("   ")).toEqual({ kind: "blank" });
    expect(preprocessLine("# Budget")).toEqual({ kind: "comment" });
    expect(preprocessLine("  // aside")).toEqual({ kind: "comment" });
  });

  it("strips currency symbols and records the currency", () => {
    expect(expr("$10").currencyCode).toBe("USD");
    expect(expr("€10").currencyCode).toBe("EUR");
    expect(expr("£10").currencyCode).toBe("GBP");
    expect(expr("10").currencyCode).toBeNull();
    expect(expr("$10").expr.trim()).toBe("10");
  });

  it("removes thousands separators", () => {
    expect(expr("1,200,000 + 1").expr).toBe("1200000 + 1");
  });

  it("rewrites English operators and a leading `what is`", () => {
    expect(expr("what is 10 plus 2").expr).toBe("10 + 2");
    expect(expr("8 divided by 2 minus 1").expr).toBe("8 / 2 - 1");
    expect(expr("3 times 4").expr).toBe("3 * 4");
  });

  it("rewrites percentages", () => {
    expect(expr("25% of 200").expr).toBe("(( 25 ) / 100) * ( 200 )");
    expect(expr("$1,200 + 5%").expr).toBe("( 1200 ) * ( 1 + ( (5) / 100 ) )");
    expect(expr("x = 8.5%").expr).toBe("x = 8.5");
  });

  it("normalises unit aliases and `in` conversions", () => {
    expect(expr("3 lbs in kg").expr).toBe("3 lb to kg");
    expect(expr("100 fahrenheit to celsius").expr).toBe("100 degF to degC");
  });

  it("flags a total line regardless of case", () => {
    expect(expr("total").isTotalLine).toBe(true);
    expect(expr("  TOTAL ").isTotalLine).toBe(true);
    expect(expr("total * 12").isTotalLine).toBe(false);
  });
});
