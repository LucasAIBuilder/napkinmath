import { describe, expect, it } from "vitest";
import { evaluateLines } from "../../src/lib/engine";
import { results } from "./helpers";

describe("arithmetic", () => {
  it("evaluates operators and parentheses", () => {
    expect(results(["10 + 5", "(10 + 5) * 3", "2 ^ 8"])).toEqual(["15", "45", "256"]);
  });

  it("understands English operators", () => {
    expect(
      results(["10 plus 2", "10 minus 3", "10 divided by 2", "5 times 4", "10 multiplied by 3", "9 over 3"]),
    ).toEqual(["12", "7", "5", "20", "30", "3"]);
  });

  it("handles percentages", () => {
    expect(results(["25% of 200", "200 + 10%", "200 - 15%", "what is 33% of 600"])).toEqual([
      "50",
      "220",
      "170",
      "198",
    ]);
  });
});

describe("variables", () => {
  it("assigns and reuses variables", () => {
    const out = results(["Price = 49.99", "tax = 8.5%", "price + tax% of price"]);
    expect(out[0]).toBe("49.99");
    expect(out[2]).toBe("54.23915");
  });

  it("treats names case-insensitively", () => {
    const { lineEvals, definedVars } = evaluateLines(["Price = 10", "PRICE * 2", "price + 1"]);
    expect(lineEvals.map((le) => le.value)).toEqual([10, 20, 11]);
    expect([...definedVars]).toEqual(["price"]);
  });

  it("keeps a named formula with a currency symbol in that currency", () => {
    expect(results(["rent = €1,500", "food = 300", "need = €rent + food"])).toEqual([
      "€1,500.00",
      "300",
      "€1,800.00",
    ]);
  });

  it("resolves lineN references", () => {
    expect(results(["10", "20", "line1 + line2"])).toEqual(["10", "20", "30"]);
  });
});

describe("previous and total", () => {
  it("uses the previous result", () => {
    expect(results(["1500", "previous * 12", "prev + 200"])).toEqual(["1,500", "18,000", "18,200"]);
  });

  it("totals the lines above, including assignments, and resets after each total", () => {
    const out = results(["rent = 1500", "utilities = 200", "groceries = 400", "total", "100", "total"]);
    expect(out[3]).toBe("2,100");
    expect(out[5]).toBe("100");
  });

  it("recognises total in any case", () => {
    expect(results(["5", "7", "TOTAL"])[2]).toBe("12");
  });
});

describe("units and currencies", () => {
  it("converts units, including aliases and `in`", () => {
    const out = results(["160cm to ft", "150 kg to lbs", "5 miles in km", "2 hours to minutes"]);
    expect(out[0]).toBe("5.25 ft");
    expect(out[1]).toBe("330.69 lb");
    expect(out[2]).toBe("8.05 km");
    expect(out[3]).toBe("120 minute");
  });

  it("carries a currency through variables, prev, lineN and total", () => {
    expect(
      results(["coffee = $4.50", "coffee * 5 * 52", "prev / 12", "line2 + 10", "rent = 1500", "total", "total * 12"]),
    ).toEqual(["$4.50", "$1,170.00", "$97.50", "$1,180.00", "1,500", "$3,952.00", "$47,424.00"]);
  });

  it("drops the currency when referenced values mix currencies", () => {
    expect(results(["a = $10", "b = €5", "a + b", "€a + b"])).toEqual(["$10.00", "€5.00", "15", "€15.00"]);
  });

  it("treats money divided by money as a plain ratio, and money times or over a number as money", () => {
    expect(
      results(["rent = $1,500", "salary = $6,000", "rent / salary", "rent / salary * 100", "rent / 2", "2 * rent", "rent * salary"]),
    ).toEqual(["$1,500.00", "$6,000.00", "0.25", "25", "$750.00", "$3,000.00", "9.00M"]);
  });

  it("ignores inline comments, keeps currency through functions, errors and any-case names", () => {
    expect(results(["rent = $1,500", "12 # months of rent", "round(RENT / 7)", "2 +", "prev"])).toEqual([
      "$1,500.00",
      "12",
      "$214.00",
      null,
      "$214.00",
    ]);
  });

  it("gives a total of mixed currencies no currency", () => {
    expect(results(["$10", "€5", "total"])).toEqual(["$10.00", "€5.00", "15"]);
  });

  it("leaves unit results and plain numbers alone", () => {
    expect(results(["price = $3", "5 km to mile", "price * 2 + 1"])[1]).toMatch(/mile$/);
    expect(results(["n = 4", "n * 2"])).toEqual(["4", "8"]);
  });

  it("formats each line in its own currency", () => {
    expect(results(["$200 + 10%", "€100 + 20", "£10 + 2"])).toEqual(["$220.00", "€120.00", "£12.00"]);
  });
});

describe("blank lines, comments and errors", () => {
  it("classifies blank and comment lines without results", () => {
    const { lineEvals } = evaluateLines(["# note", "", "// aside", "5"]);
    expect(lineEvals.map((le) => le.kind)).toEqual(["comment", "blank", "comment", "expr"]);
    expect(results(["# note", "", "// aside", "5"])).toEqual([null, null, null, "5"]);
  });

  it("marks undefined names and malformed input as errors instead of throwing", () => {
    const { lineEvals } = evaluateLines(["foo + 1", "2 +", "((("]);
    expect(lineEvals.map((le) => le.error)).toEqual([true, true, true]);
    expect(lineEvals.map((le) => le.value)).toEqual([null, null, null]);
  });

  it("keeps `previous` pointing at the last good result after an error", () => {
    expect(results(["10", "2 +", "prev"])).toEqual(["10", null, "10"]);
  });
});
