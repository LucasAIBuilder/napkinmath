import { gunzipSync } from "node:zlib";
import { expect, test, type Page, type Request } from "@playwright/test";
import { APP_URL, resultLines, seedTheme } from "./helpers";

const POSTHOG = /posthog\.com/;
const SHEET = "napkinsecret = 4321\nnapkinsecret * 2";
const PRIVATE = ["napkinsecret", "4321", "8642", "8,642"];

function decodeBody(request: Request) {
  const body = request.postDataBuffer();
  if (!body) return "";
  const gzipped = body[0] === 0x1f && body[1] === 0x8b;
  return (gzipped ? gunzipSync(body) : body).toString();
}

async function typeSheetAndAddOne(page: Page) {
  await page.locator("textarea").fill("");
  await page.locator("textarea").pressSequentially(SHEET);
  await expect.poll(() => resultLines(page)).toEqual(["4,321", "8,642"]);
  await page.locator("button:visible", { hasText: "New" }).click();
}

test("local builds never contact PostHog", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => POSTHOG.test(r.url()) && calls.push(r.url()));
  await seedTheme(page);
  await page.goto(APP_URL);
  await typeSheetAndAddOne(page);
  await page.waitForTimeout(4000);
  expect(calls).toEqual([]);
});

test.describe("on napkinmath.app", () => {
  // PostHog drops events from browsers that look automated (headless user agent, client hints, navigator.webdriver).
  test.use({
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        get: () => false,
      });
      Object.defineProperty(Navigator.prototype, "userAgentData", {
        get: () => undefined,
      });
    });
  });

  test("PostHog gets pageviews and counts but no sheet content, cookies or storage", async ({ page, context }) => {
    // Serve the local production build as https://napkinmath.app and capture PostHog traffic without sending it.
    await page.route("https://napkinmath.app/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: new URL(url.pathname + url.search, APP_URL).toString(),
      });
      await route.fulfill({ response });
    });
    const bodies: string[] = [];
    await page.route(POSTHOG, async (route) => {
      bodies.push(decodeBody(route.request()));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"status":1}',
      });
    });

    await seedTheme(page);
    await page.goto("https://napkinmath.app/");
    await typeSheetAndAddOne(page);

    const sent = () => bodies.join("\n");
    // Every request must decode to readable events, or the "not.toContain" checks below would prove nothing.
    const unreadable = () => bodies.filter((b) => b && !b.includes('"event"'));
    await expect.poll(sent, { timeout: 15000 }).toContain('"calculation_evaluated"');
    await expect.poll(sent).toContain('"sheet_created"');
    expect(sent()).toContain('"$pageview"');
    expect(sent()).toContain('"lines_with_results":2');
    expect(unreadable()).toEqual([]);
    for (const value of PRIVATE) expect(sent()).not.toContain(value);

    expect(await context.cookies()).toEqual([]);
    const storageKeys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    expect(storageKeys.filter((k) => !k.startsWith("napkinmath:"))).toEqual([]);
  });
});
