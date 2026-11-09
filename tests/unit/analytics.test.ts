import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: posthog }));

async function freshModule() {
  vi.resetModules();
  return import("../../src/lib/analytics");
}

beforeEach(() => {
  posthog.init.mockClear();
  posthog.capture.mockClear();
});

describe("analytics", () => {
  it.each(["localhost", "127.0.0.1", "napkinmath.pages.dev", "example.com"])("does nothing on %s", async (host) => {
    const { initAnalytics, track } = await freshModule();
    await initAnalytics(host);
    track({ name: "sheet_created" });
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("initializes on napkinmath.app with cookieless mode and no automatic capture of page content", async () => {
    const { initAnalytics } = await freshModule();
    await initAnalytics("napkinmath.app");
    expect(posthog.init).toHaveBeenCalledOnce();
    const [token, config] = posthog.init.mock.calls[0];
    expect(token).toMatch(/^phc_/);
    expect(config).toMatchObject({
      api_host: "https://eu.i.posthog.com",
      cookieless_mode: "always",
      autocapture: false,
      rageclick: false,
      capture_pageview: true,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      disable_session_recording: true,
    });
  });

  it("sends only the event name and counts", async () => {
    const { initAnalytics, track } = await freshModule();
    await initAnalytics("napkinmath.app");
    track({ name: "sheet_created" });
    track({
      name: "calculation_evaluated",
      properties: { lines_with_results: 3 },
    });
    expect(posthog.capture.mock.calls).toEqual([
      ["sheet_created", undefined],
      ["calculation_evaluated", { lines_with_results: 3 }],
    ]);
  });
});
