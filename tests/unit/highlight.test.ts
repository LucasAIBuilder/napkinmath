import { describe, expect, it } from "vitest";
import { evaluateLines } from "../../src/lib/engine";
import { highlightText } from "../../src/lib/highlight";

function highlight(text: string) {
  const { lineEvals, definedVars } = evaluateLines(text.split("\n"));
  return highlightText(text, definedVars, lineEvals).split("\n");
}

const span = (token: string) => `<span style="color:var(--nm-syn-${token})`;

describe("highlightText", () => {
  it("colours variables, operators and numbers", () => {
    const [line] = highlight("rent = 1500");
    expect(line).toContain(`${span("variable")}">rent</span>`);
    expect(line).toContain(`${span("operator")}">=</span>`);
    expect(line).toContain(`${span("number")}">1500</span>`);
  });

  it("colours a known variable on later lines and unknown names as identifiers", () => {
    const lines = highlight("rent = 1500\nrent + bonus");
    expect(lines[1]).toContain(`${span("variable")}">rent</span>`);
    expect(lines[1]).toContain(`${span("ident")}">bonus</span>`);
  });

  it("styles keywords and comments", () => {
    const lines = highlight("5\ntotal\n# Budget");
    expect(lines[1]).toContain(`${span("keyword")};font-weight:500">total</span>`);
    expect(lines[2]).toBe(`<span style="color:var(--nm-syn-comment);font-style:italic"># Budget</span>`);
  });

  it("keeps one output line per input line, with blank lines as &nbsp;", () => {
    const lines = highlight("1\n\n2");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("&nbsp;");
  });

  it("escapes HTML and underlines lines that fail to evaluate", () => {
    const [line] = highlight(`<b> & 'x'`);
    expect(line).not.toContain("<b>");
    expect(line).toContain("&lt;b&gt; &amp; &#039;x&#039;");
    expect(line).toMatch(/^<span style="text-decoration:underline;text-decoration-color:var\(--nm-syn-error\)/);
  });
});
