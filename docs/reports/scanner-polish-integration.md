# Scanner polish integration review

## Scope and outcome

Combines the user's four requests: retain verified candidates until another verified candidate replaces them; align camera/settings controls and replace settings text with an accessible gear; show physical set icon/name/code in the compact panel; use seven equal rounded Japanese format badges.

Integrated in isolated `release/scanner-polish` worktree from `4d649e3`. Original Sol implementations were isolated as sticky-candidate, scanner-toolbar, candidate-set-badge and format-text-badges. See their individual reports for RED/GREEN evidence.

## Conflict decisions

- `src/main.ts`, hideSuggestion: disjoint intentions, retain loading cancellation AND set badge clear on explicit clear.
- `src/main.ts`, presentSuggestion: old eager clearing is superseded by requested sticky semantics. Keep the verified display while B loads; apply SetBadge.update only when the verified physical replacement commits. No old-name/new-icon mix.
- `src/ui/style.css`, end-of-file additions: disjoint toolbar and candidate-set selectors, preserve both.

## Parent QA

- npm ci: 0 vulnerabilities.
- npm run check: 22 files / 167 tests PASS; typecheck PASS.
- npm run build: PASS.
- Final `MVP_PORT=4283 npm run test:e2e`: 222 PASS, 1.2m, exit 0. Chromium desktop/mobile viewport projects. Full raw log: research/scanner-polish-release-e2e.log.
- Format keyboard/layout repetition: 20 PASS, 10.3s, exit 0.
- git diff --check: PASS.
- Real public Delver back-face image through real worker and Scryfall: correct back-face image, Japanese names, physical Innistrad Remastered (INR) with loaded official SVG.
- Actual layout measurements at390px: camera and gear y=8, height44; seven badges88x32. Exact labels: スタン / パイオニア / モダン / レガシー / ヴィンテ / 統率者 / パウパー.
- Inspected combined320px synthetic and390px public-image screenshots. Expanded candidate details remain internally scrollable.

## Additional findings and resolutions

1. Set metadata adds one API request. Preserve old 3-request coalescing assertion separately and assert exactly one /sets request, not a relaxed total bound. Initial two RED failures documented in research/scanner-polish-e2e.log.
2. Parent public-image screenshot found scanFile falsely saying no candidate because verified metadata is now asynchronous. Added failing status assertion, Sol changed only scanFile to use the recognition proposal and conditional truthful guidance. Subsequent full regression passes.
3. A format geometry/keyboard test pressed Space concurrently with initial card hydration. Trace showed keyboard start8401.869 and card request8402.104 (response within2.647ms). The test now waits for real price/printing completion before its ordinary keyboard scenario; late-FX tests remain unchanged. Repeated20 times then complete suite successfully; no retries/skips/threshold weakening.

## Limits

Synthetic worker/camera fixtures prove state/UI behavior, not recognition accuracy. The separate public-image probe uses real worker/provider data but is not a physical-camera test. Human iPhone/Android testing NOT RUN. Original intermittent preparation failure on the user's device remains unconfirmed; this work does not claim to diagnose it. Main is not merged. Deployment and commit handles are recorded in Issue22 after read-back.
