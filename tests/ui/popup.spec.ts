import { test } from "@playwright/test";
import {
  POPUP_URL,
  GUTTER,
  RESULTS,
  expectEnterReturnsToLineStart,
  expectTypingAfterTabsKeepsScroll,
  expectTypingDeepInLineShows,
  expectTypingOnEmptyRowShows,
  expectShortcutsKeepCaret,
  expectGutterClearOfText,
  expectHorizontalOverflow,
  expectLayersAligned,
  expectSameBottomEdge,
  tallSheet,
  wheelTo,
} from "./helpers";

// The popup is served as a plain page; without chrome.storage it falls back to localStorage.
test.use({ viewport: { width: 400, height: 500 } });

test("extension popup keeps layers aligned and the gutter clear of the text", async ({ page, browserName }) => {
  await page.goto(POPUP_URL);
  await page.locator("textarea").fill(tallSheet({ longLine: true, longResults: true }));
  await expectGutterClearOfText(page);
  await expectHorizontalOverflow(page, { editor: true, results: true });
  await expectSameBottomEdge(page, { scrollbarsTakeSpace: browserName === "chromium" });

  await wheelTo(page, "textarea", { to: "bottom", right: true });
  await expectLayersAligned(page, { at: "bottom", scrolledRight: true });
  await wheelTo(page, RESULTS, { to: "top" });
  await expectLayersAligned(page, { at: "top", scrolledRight: true });
  await wheelTo(page, RESULTS, { to: "bottom" });
  await expectLayersAligned(page, { at: "bottom", scrolledRight: true });
});

test("extension popup: Enter on a long line scrolled to the right brings the caret back beside the line numbers", async ({ page }) => {
  await page.goto(POPUP_URL);
  await page.locator("textarea").fill(tallSheet({ longLine: true }));
  await expectEnterReturnsToLineStart(page);
});

test("extension popup: scrolled right, typing on an empty row shows the text with the editor back at column 0", async ({ page }) => {
  await page.goto(POPUP_URL);
  await expectTypingOnEmptyRowShows(page);
});

test("extension popup: typing deep in a long line scrolled out of view shows the text without jumping to column 0", async ({ page }) => {
  await page.goto(POPUP_URL);
  await expectTypingDeepInLineShows(page);
});

test("extension popup: typing after tab indentation with the caret on screen leaves the scroll alone", async ({ page }) => {
  await page.goto(POPUP_URL);
  await expectTypingAfterTabsKeepsScroll(page);
});

test("extension popup: every layer ends at the same bottom edge whichever column overflows", async ({ page, browserName }) => {
  await page.goto(POPUP_URL);
  const editor = page.locator("textarea");
  const cases = [
    { sheet: {}, overflow: { editor: false, results: false } },
    { sheet: { longLine: true }, overflow: { editor: true, results: false } },
    { sheet: { longResults: true }, overflow: { editor: false, results: true } },
  ];
  for (const { sheet, overflow } of cases) {
    await editor.fill(tallSheet(sheet));
    await expectHorizontalOverflow(page, overflow);
    await expectSameBottomEdge(page, { scrollbarsTakeSpace: browserName === "chromium" });
  }
});

test("extension popup: wheel over the line numbers scrolls the editor", async ({ page }) => {
  await page.goto(POPUP_URL);
  await page.locator("textarea").fill(tallSheet());
  await wheelTo(page, GUTTER, { to: "bottom" });
  await expectLayersAligned(page, { at: "bottom", scrolledRight: false });
  await wheelTo(page, GUTTER, { to: "top" });
  await expectLayersAligned(page, { at: "top", scrolledRight: false });
});

test("extension popup shortcuts keep the caret on the edited text; Ctrl+L does nothing", async ({ page }) => {
  await page.goto(POPUP_URL);
  await expectShortcutsKeepCaret(page);
});
