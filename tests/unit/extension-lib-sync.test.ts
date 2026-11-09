import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The extension bundles its own copy of the engine; it must match the web app's.
const shared = ["engine.ts", "formatter.ts", "highlight.ts", "preprocessor.ts", "shortcuts.ts"];

describe("extension/lib", () => {
  it.each(shared)("%s matches src/lib", (file) => {
    const web = readFileSync(new URL(`../../src/lib/${file}`, import.meta.url), "utf8");
    const ext = readFileSync(new URL(`../../extension/lib/${file}`, import.meta.url), "utf8");
    expect(ext).toBe(web);
  });
});
