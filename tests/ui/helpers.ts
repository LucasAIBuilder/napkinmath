import { expect, type Page } from "@playwright/test";

export const APP_URL = "http://127.0.0.1:4173/";
export const POPUP_URL = "http://127.0.0.1:4174/popup.html";

// Skip the first-run theme picker without overriding a theme the test chose itself.
export async function seedTheme(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("napkinmath:scheme:v3")) {
      localStorage.setItem("napkinmath:scheme:v3", "midnight");
      localStorage.setItem("napkinmath:mode:v3", "dark");
    }
  });
}

// What the results column shows, one entry per line ("" for lines without a result).
export async function resultLines(page: Page) {
  const text = await page.locator('[data-testid="results"]').innerText();
  return text.split("\n").map((s) => s.replace(/\u00a0/g, "").trim());
}

// A sheet tall enough to scroll vertically, optionally with a long editor line and/or long results.
export function tallSheet({ longLine = false, longResults = false } = {}) {
  const lines = Array.from({ length: 40 }, (_, i) => `x${i + 1} = ${i + 1}`);
  if (longLine) lines.splice(5, 0, `# ${"this comment runs far past the right edge of the editor ".repeat(4)}`);
  if (longResults) lines.push("big1 = $999000000000000", "big2 = $888000000000000");
  return lines.join("\n");
}

export const RESULTS = '[data-testid="results"]';
export const GUTTER = '[data-testid="gutter"]';

const LAYERS = {
  textarea: "textarea",
  highlight: '[data-testid="highlight"]',
  gutter: '[data-testid="gutter"]',
  results: '[data-testid="results"]',
};

function overflowState(page: Page) {
  return page.evaluate((layers) => {
    const ta = document.querySelector<HTMLElement>(layers.textarea)!;
    const res = document.querySelector<HTMLElement>(layers.results)!;
    return { editor: ta.scrollWidth > ta.clientWidth, results: res.scrollWidth > res.clientWidth };
  }, LAYERS);
}

// Which columns have content wider than their visible area (and so can scroll sideways).
export async function expectHorizontalOverflow(page: Page, expected: { editor: boolean; results: boolean }) {
  await expect.poll(() => overflowState(page)).toEqual(expected);
}

function bottomEdges(page: Page) {
  return page.evaluate((layers) =>
    Object.fromEntries(
      Object.entries(layers).map(([name, selector]) => {
        const el = document.querySelector<HTMLElement>(selector)!;
        const cs = getComputedStyle(el);
        const strip = el.offsetHeight - el.clientHeight - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
        return [name, { strip, bottom: el.getBoundingClientRect().top + el.clientTop + el.clientHeight }];
      }),
    ), LAYERS);
}

// Every layer reserves the same horizontal scrollbar strip, so a partly visible last row is cut off
// at the same line in the editor, gutter and results. Where scrollbars take space (our Chromium config)
// the strip must be there; overlay scrollbars (Firefox on Linux) take none.
export async function expectSameBottomEdge(page: Page, { scrollbarsTakeSpace }: { scrollbarsTakeSpace: boolean }) {
  const edges = await bottomEdges(page);
  const { strip, bottom } = edges.textarea;
  if (scrollbarsTakeSpace) expect(strip).toBeGreaterThan(0);
  for (const [name, edge] of Object.entries(edges)) {
    expect({ layer: name, strip: edge.strip, bottom: Math.round(edge.bottom) }).toEqual({
      layer: name,
      strip,
      bottom: Math.round(bottom),
    });
  }
}

// Whether anything is painted in a column's scrollbar strip (thumb or track): compare the strip with the
// same strip rendered with thumb and track made transparent. The class goes on the element itself because Chromium
// only re-resolves an element's scrollbar styles when that element is restyled.
export async function thumbPainted(page: Page, layer: "textarea" | "results") {
  const el = page.locator(LAYERS[layer]);
  const box = (await el.boundingBox())!;
  const { strip } = (await bottomEdges(page))[layer];
  const shot = () => page.screenshot({ clip: { x: box.x, y: box.y + box.height - strip, width: box.width, height: strip } });
  await page.addStyleTag({ content: ".test-hide-thumb::-webkit-scrollbar-thumb, .test-hide-thumb::-webkit-scrollbar-track { background: transparent !important; }" });
  const asRendered = await shot();
  await el.evaluate((node) => node.classList.add("test-hide-thumb"));
  const withoutThumb = await shot();
  await el.evaluate((node) => node.classList.remove("test-hide-thumb"));
  return !asRendered.equals(withoutThumb);
}

function scrollState(page: Page, line: number) {
  return page.evaluate((line) => {
    const ta = document.querySelector("textarea")!;
    const highlight = document.querySelector<HTMLElement>('[data-testid="highlight"]')!;
    const gutter = document.querySelector<HTMLElement>('[data-testid="gutter"]')!;
    const results = document.querySelector<HTMLElement>('[data-testid="results"]')!;

    // Where the textarea (caret layer) puts the middle of `line`.
    const cs = getComputedStyle(ta);
    const lineHeight = parseFloat(cs.lineHeight);
    const textTop = ta.getBoundingClientRect().top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
    const caretRow = textTop - ta.scrollTop + line * lineHeight + lineHeight / 2;

    const middle = (r: DOMRect) => r.top + r.height / 2;
    // Gutter and results render one span per line.
    const spanRow = (pre: HTMLElement) => middle(pre.children[line].getBoundingClientRect());
    // The highlight overlay is one block of text; measure the first character of `line`.
    const highlightRow = () => {
      const code = highlight.querySelector("code")!;
      let offset = code.textContent!.split("\n").slice(0, line).join("\n").length + (line > 0 ? 1 : 0);
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const len = node.textContent!.length;
        if (offset < len) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          return middle(range.getBoundingClientRect());
        }
        offset -= len;
      }
      throw new Error(`line ${line} not found in highlight overlay`);
    };

    return {
      top: ta.scrollTop,
      left: ta.scrollLeft,
      atTop: ta.scrollTop === 0,
      atBottom: Math.abs(ta.scrollHeight - ta.clientHeight - ta.scrollTop) <= 1,
      highlightTop: highlight.scrollTop,
      highlightLeft: highlight.scrollLeft,
      gutterTop: gutter.scrollTop,
      resultsTop: results.scrollTop,
      rowOffsets: {
        highlight: Math.abs(highlightRow() - caretRow),
        gutter: Math.abs(spanRow(gutter) - caretRow),
        results: Math.abs(spanRow(results) - caretRow),
      },
    };
  }, line);
}

// Every layer must sit at the textarea's scroll position and render the edge row level with the caret layer,
// or rows and caret drift apart. Checks the first line at the top, the last line at the bottom.
export async function expectLayersAligned(
  page: Page,
  { at, scrolledRight }: { at: "top" | "bottom"; scrolledRight: boolean },
) {
  const lastLine = (await page.locator("textarea").inputValue()).split("\n").length - 1;
  const line = at === "top" ? 0 : lastLine;
  await expect
    .poll(async () => {
      const s = await scrollState(page, line);
      const level = (offset: number) => offset <= 2;
      return {
        atEdge: at === "top" ? s.atTop : s.atBottom,
        scrolledRight: s.left > 0,
        highlight: s.highlightTop === s.top && s.highlightLeft === s.left,
        gutter: s.gutterTop === s.top,
        results: s.resultsTop === s.top,
        rowsLevel: {
          highlight: level(s.rowOffsets.highlight),
          gutter: level(s.rowOffsets.gutter),
          results: level(s.rowOffsets.results),
        },
      };
    })
    .toEqual({
      atEdge: true,
      scrolledRight,
      highlight: true,
      gutter: true,
      results: true,
      rowsLevel: { highlight: true, gutter: true, results: true },
    });
}

// Wheel-scroll to the top or bottom (and optionally the right edge) over the given element, like a user would.
export async function wheelTo(page: Page, selector: string, { to, right = false }: { to: "top" | "bottom"; right?: boolean }) {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // One axis per wheel event: Firefox may lock a diagonal wheel scroll to a single axis.
  const dy = to === "bottom" ? 4000 : -4000;
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, dy);
  if (right) for (let i = 0; i < 5; i++) await page.mouse.wheel(4000, 0);
}

// The line-number gutter must end before the first character of text.
export async function expectGutterClearOfText(page: Page) {
  const overlap = await page.evaluate(() => {
    const ta = document.querySelector("textarea")!;
    const gutter = document.querySelector<HTMLElement>('[data-testid="gutter"]')!;
    const textStart = ta.getBoundingClientRect().left + parseFloat(getComputedStyle(ta).paddingLeft);
    return gutter.getBoundingClientRect().right - textStart;
  });
  expect(overlap).toBeLessThanOrEqual(0);
}

// Press Enter at the end of the long line (line 6 of tallSheet({ longLine: true })) while scrolled right:
// the editor must scroll back to column 0 with the caret right of the line numbers.
export async function expectEnterReturnsToLineStart(page: Page) {
  const editor = page.locator("textarea");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+Home");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await expect.poll(() => editor.evaluate((ta: HTMLTextAreaElement) => ta.scrollLeft)).toBeGreaterThan(0);

  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const ta = document.querySelector("textarea")!;
        const gutter = document.querySelector<HTMLElement>('[data-testid="gutter"]')!;
        const caretX = ta.getBoundingClientRect().left + ta.clientLeft + parseFloat(getComputedStyle(ta).paddingLeft) - ta.scrollLeft;
        return { scrollLeft: ta.scrollLeft, caretRightOfGutter: caretX >= gutter.getBoundingClientRect().right };
      }),
    )
    .toEqual({ scrollLeft: 0, caretRightOfGutter: true });
}

// Where the character at `offset` renders, via the highlight overlay (it shows the textarea's text), and
// whether it sits inside the overlay's visible box.
function typedState(page: Page, offset: number) {
  return page.evaluate((offset) => {
    const ta = document.querySelector("textarea")!;
    const highlight = document.querySelector<HTMLElement>('[data-testid="highlight"]')!;
    const code = highlight.querySelector("code")!;
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    let rest = offset;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const len = node.textContent!.length;
      if (rest < len) {
        const range = document.createRange();
        range.setStart(node, rest);
        range.setEnd(node, rest + 1);
        const r = range.getBoundingClientRect();
        const left = highlight.getBoundingClientRect().left + highlight.clientLeft;
        return {
          char: node.textContent![rest],
          visible: r.left >= left - 0.5 && r.right <= left + highlight.clientWidth + 0.5,
          scrolled: ta.scrollLeft > 0,
          atLineStart: ta.scrollLeft === 0,
        };
      }
      rest -= len;
    }
    return null;
  }, offset);
}

const LONG_LINE = `# ${"this comment runs far past the right edge of the editor ".repeat(4)}`;

// Scrolled right, click an empty row and type: the typed character must show, with the editor back at column 0,
// whether it was scrolled slightly (less than its padding) or far.
export async function expectTypingOnEmptyRowShows(page: Page) {
  const editor = page.locator("textarea");
  for (const scroll of ["slight", "far"]) {
    await editor.fill([LONG_LINE, "", "x = 2"].join("\n"));
    const box = (await editor.boundingBox())!;
    const { lineHeight, paddingTop } = await editor.evaluate((ta) => {
      const cs = getComputedStyle(ta);
      return { lineHeight: parseFloat(cs.lineHeight), paddingTop: parseFloat(cs.paddingTop) };
    });
    if (scroll === "slight") await editor.evaluate((ta) => { ta.scrollLeft = 8; });
    else await wheelTo(page, "textarea", { to: "top", right: true });
    await expect.poll(() => editor.evaluate((ta) => ta.scrollLeft)).toBeGreaterThan(0);

    await page.mouse.click(box.x + box.width / 2, box.y + paddingTop + 1.5 * lineHeight);
    const offset = LONG_LINE.length + 1;
    await expect.poll(() => editor.evaluate((ta: HTMLTextAreaElement) => ta.selectionStart)).toBe(offset);
    await page.keyboard.type("1");
    await expect.poll(() => typedState(page, offset)).toEqual({ char: "1", visible: true, scrolled: false, atLineStart: true });
  }
}

// Caret deep in a long line, scrolled out of view to the left: typing shows the typed character
// without jumping back to column 0.
export async function expectTypingDeepInLineShows(page: Page) {
  const editor = page.locator("textarea");
  await editor.fill([LONG_LINE, "x = 2"].join("\n"));
  const offset = 100;
  await editor.evaluate((ta: HTMLTextAreaElement, offset) => {
    ta.focus();
    ta.setSelectionRange(offset, offset);
  }, offset);
  await wheelTo(page, "textarea", { to: "top", right: true });
  await expect.poll(() => typedState(page, offset)).toMatchObject({ visible: false, scrolled: true });

  await page.keyboard.type("1");
  await expect.poll(() => typedState(page, offset)).toEqual({ char: "1", visible: true, scrolled: true, atLineStart: false });
}

// A tab-indented line (tabs only arrive by paste; Tab moves focus): with the caret comfortably on screen,
// typing must leave the scroll position alone. Measuring tabs as single spaces would place the caret
// near the left edge and jump to column 0.
export async function expectTypingAfterTabsKeepsScroll(page: Page) {
  const editor = page.locator("textarea");
  const tabbed = `${"\t".repeat(10)}x`;
  await editor.fill([LONG_LINE, tabbed].join("\n"));
  const offset = LONG_LINE.length + 1 + tabbed.length;
  const scrollLeft = await editor.evaluate((ta: HTMLTextAreaElement, offset) => {
    ta.focus();
    ta.setSelectionRange(offset, offset);
    // Scroll by 13 characters: after typing, the caret (22 columns in) stays well inside the view, while
    // tabs counted as single spaces would put it at column 12, at the left edge.
    const cs = getComputedStyle(ta);
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    ta.scrollLeft = Math.round(ctx.measureText("0".repeat(13)).width);
    return ta.scrollLeft;
  }, offset);
  expect(scrollLeft).toBeGreaterThan(0);
  await expect.poll(() => typedState(page, offset - 1)).toMatchObject({ char: "x", visible: true });

  await page.keyboard.type("1");
  await expect.poll(() => typedState(page, offset)).toMatchObject({ char: "1", visible: true });
  expect(await editor.evaluate((ta) => ta.scrollLeft)).toBe(scrollLeft);
}

// Comment toggle, duplicate line and the removed clear shortcut, typing straight after each shortcut.
export async function expectShortcutsKeepCaret(page: Page) {
  const editor = page.locator("textarea");
  await editor.fill("rent = 1500\n");
  await editor.evaluate((ta: HTMLTextAreaElement) => ta.setSelectionRange(ta.value.length, ta.value.length));
  await page.keyboard.press("ControlOrMeta+/");
  await page.keyboard.type("note");
  await expect(editor).toHaveValue("rent = 1500\n# note");

  await editor.evaluate((ta: HTMLTextAreaElement) => ta.setSelectionRange(4, 4));
  await page.keyboard.press("ControlOrMeta+/");
  await page.keyboard.type("X");
  await expect(editor).toHaveValue("# rentX = 1500\n# note");
  await page.keyboard.press("ControlOrMeta+/");
  await page.keyboard.type("Y");
  await expect(editor).toHaveValue("rentXY = 1500\n# note");

  await page.keyboard.press("ControlOrMeta+d");
  await page.keyboard.type("Z");
  await expect(editor).toHaveValue("rentXY = 1500\nrentXYZ = 1500\n# note");

  await page.keyboard.press("ControlOrMeta+l");
  await expect(editor).toHaveValue("rentXY = 1500\nrentXYZ = 1500\n# note");
}
