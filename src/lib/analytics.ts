import type { PostHog } from "posthog-js";

// Public project token (PostHog project "NapkinMath", EU cloud); safe in client code.
const POSTHOG_TOKEN = "phc_puFhQFB4PGovDeCCob3Go2gpiMJohe5voN3Ytk6w3fud";
const LIVE_HOSTNAME = "napkinmath.app";

type AnalyticsEvent =
  | { name: "sheet_created" }
  | {
      name: "calculation_evaluated";
      properties: { lines_with_results: number };
    };

let client: PostHog | null = null;

// Only the live site sends anything: local runs, tests, previews and forks never load PostHog.
// Sheet text, names and results are never sent; events carry counts at most.
export async function initAnalytics(hostname = window.location.hostname) {
  if (hostname !== LIVE_HOSTNAME) return;
  const { default: posthog } = await import("posthog-js");
  posthog.init(POSTHOG_TOKEN, {
    api_host: "https://eu.i.posthog.com",
    cookieless_mode: "always",
    autocapture: false,
    rageclick: false,
    capture_pageview: true,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
  });
  client = posthog;
}

export function track(event: AnalyticsEvent) {
  if (!client) return;
  client.capture(event.name, "properties" in event ? event.properties : undefined);
}
