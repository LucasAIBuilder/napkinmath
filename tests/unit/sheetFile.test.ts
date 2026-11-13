import { describe, expect, it } from "vitest";
import {
  backupFileName,
  buildBackup,
  mergeSheets,
  parseBackup,
  sheetFileName,
  type SheetRecord,
} from "../../src/lib/sheetFile";

const sheet = (id: string, updatedAt: number, extra: Partial<SheetRecord> = {}): SheetRecord => ({
  id,
  name: `Sheet ${id}`,
  emoji: "🧮",
  content: `x = ${id}`,
  updatedAt,
  ...extra,
});

describe("backup files", () => {
  it("round-trip through buildBackup and parseBackup", () => {
    const sheets = [sheet("a", 1), sheet("b", 2, { content: "rent = $1,500\ntotal" })];
    const text = buildBackup(sheets, 1234);
    expect(JSON.parse(text)).toMatchObject({ app: "napkinmath", version: 1, exportedAt: 1234 });
    expect(text).toContain('\n  "sheets": [');
    expect(parseBackup(text)).toEqual({ ok: true, sheets });
  });

  it("drop unknown sheet fields", () => {
    const text = JSON.stringify({ app: "napkinmath", version: 1, sheets: [{ ...sheet("a", 1), extra: true }] });
    expect(parseBackup(text)).toEqual({ ok: true, sheets: [sheet("a", 1)] });
  });

  it("are named by local date", () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe("napkinmath-2026-01-05.napkin");
  });

  it.each([
    ["not JSON", "hello", "not a NapkinMath backup"],
    ["another app", JSON.stringify({ app: "other", version: 1, sheets: [] }), "not a NapkinMath backup"],
    ["a JSON array", "[]", "not a NapkinMath backup"],
    ["a newer version", JSON.stringify({ app: "napkinmath", version: 2, sheets: [sheet("a", 1)] }), "newer"],
    ["no sheets list", JSON.stringify({ app: "napkinmath", version: 1 }), "damaged"],
    ["a sheet without content", JSON.stringify({ app: "napkinmath", version: 1, sheets: [{ id: "a", name: "A", emoji: "", updatedAt: 1 }] }), "damaged"],
    ["a sheet with an empty id", JSON.stringify({ app: "napkinmath", version: 1, sheets: [sheet("", 1)] }), "damaged"],
    ["no sheets", JSON.stringify({ app: "napkinmath", version: 1, sheets: [] }), "no sheets"],
  ])("reject %s", (_, text, message) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe("mergeSheets", () => {
  it("adds new sheets after the current ones", () => {
    const current = [sheet("a", 5)];
    expect(mergeSheets(current, [sheet("b", 1), sheet("c", 1)])).toEqual({
      sheets: [sheet("a", 5), sheet("b", 1), sheet("c", 1)],
      added: 2,
      updated: 0,
    });
  });

  it("keeps the newer copy of a sheet with the same id", () => {
    const current = [sheet("a", 5), sheet("b", 5)];
    const result = mergeSheets(current, [sheet("a", 9, { content: "newer" }), sheet("b", 3, { content: "older" })]);
    expect(result.sheets).toEqual([sheet("a", 9, { content: "newer" }), sheet("b", 5)]);
    expect(result).toMatchObject({ added: 0, updated: 1 });
  });

  it("ignores an identical import", () => {
    const current = [sheet("a", 5)];
    expect(mergeSheets(current, [sheet("a", 5)])).toEqual({ sheets: current, added: 0, updated: 0 });
  });

  it("counts a sheet repeated in the file once", () => {
    const result = mergeSheets([sheet("a", 1)], [sheet("a", 2), sheet("a", 3), sheet("b", 1), sheet("b", 2)]);
    expect(result.sheets).toEqual([sheet("a", 3), sheet("b", 2)]);
    expect(result).toMatchObject({ added: 1, updated: 1 });
  });
});

describe("sheetFileName", () => {
  it.each([
    ["Budget 2026", "Budget 2026.txt"],
    ["a/b\\c:d*e?f\"g<h>i|j", "a b c d e f g h i j.txt"],
    ["  ..hidden..  ", "hidden.txt"],
    ["", "Untitled.txt"],
    ["///", "Untitled.txt"],
    ["CON", "CON sheet.txt"],
    ["🧮 Trip", "🧮 Trip.txt"],
    ["x".repeat(150), `${"x".repeat(100)}.txt`],
  ])("%j -> %j", (name, expected) => {
    expect(sheetFileName(name)).toBe(expected);
  });
});
