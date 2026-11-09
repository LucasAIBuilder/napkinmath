# Agent guidance for NapkinMath

Instructions for coding agents (and people) working on this repo.
If `AGENTS.local.md` exists next to this file, read it too: it holds the maintainer's personal working rules and machine setup, and is not in the repo.

## Layout
- `src/lib/`: the calculator core. `preprocessor.ts` turns plain English into math.js expressions, `engine.ts` evaluates a sheet line by line (variables, `prev`, `lineN`, `total`, currencies), `formatter.ts` formats results, `highlight.ts` colours the editor.
- `src/components/`, `src/App.tsx`: the web app (React).
- `extension/`: the browser extension popup. `extension/lib/` is a copy of the shared files in `src/lib/`; `tests/unit/extension-lib-sync.test.ts` fails if they drift, so change both together.
- `src/lib/analytics.ts`: PostHog, loaded only on napkinmath.app, cookieless. Never send sheet text, variable names or results.

## Workflow
- Read the relevant code before changing it.
- For anything beyond a small fix, write a short plan first and get it approved before building.
- Prefer the smallest change that does the job. No refactors or unrelated edits unless asked.

## Testing
Work is not done until these pass:

    npm run build
    npm test            # unit tests (Vitest)
    npm run ext:build
    npm run test:ui     # browser tests (Playwright, Chromium and Firefox)

- New parser or evaluator behaviour gets unit tests in `tests/unit/`.
- Editor behaviour (typing, scrolling, persistence) gets browser tests in `tests/ui/`.
