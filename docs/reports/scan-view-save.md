# Scan → view → optional save

Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/scan-view-save`  
Branch: `feat/scan-view-save`  
Base/HEAD: `13fd5b723cae792af08d55b2032285ad8f2ab56a`  
Implementation is an uncommitted working-tree diff, as requested. No commit, push, merge or deployment.

## Implemented behavior

- Verified candidate metadata, physical reference image/set, truthful USD/approximate JPY and all seven 52×20 format badges appear before saving. Removed the up/down panel controls.
- Separate native buttons over the image and name, and `詳細を見る`, open a bottom dialog. Static identity content, face switches, formats and save controls are separate; no nested interactive controls. Expanded names, face controls and printed/Oracle rules wrap fully.
- Native modal dialog with initial close focus, explicit Tab endpoints, Escape and restoration to the originating button. `×` is named `閉じる`. A primary downward header pointer gesture of at least 60px closes; body scrolling and body pointer gestures do not.
- Detail moves the existing persistent candidate DOM into the sheet and freezes the verified physical candidate. Recognition/camera continue with one inflight frame. New physical metadata is verified in the background and retained separately; close commits the latest verified snapshot while retaining any newer pending request. Delayed/unverified/superseded responses cannot replace the reader's snapshot.
- `履歴に保存` is the only recognition history write. It saves the displayed snapshot once, including during detail reading; preserves a newer pending identity, and retains stationary-Oracle suppression/absence rearm. Brief `保存しました ✓` feedback lasts 1800ms. Saving retains the displayed card; closing without a newer verified candidate retains it too. Existing pointer/key snapshot, autorepeat and cancellation protections remain.
- `別のカードを探す` opens the existing name-search correction with the known name and search focus. It creates no history. Search selection retains the existing verified repository/manual flows.
- Detail can open the existing printing/language/finish correction before saving, without creating history or starting/stopping the camera. Reopening preserves the existing same-Oracle physical override and finish. Recognition does not replace that independent manual session.
- Display-only Japanese retrieval uses its own repository request queue so a slow A translation cannot block physical verification of B. Existing shared provider scheduling, validated caches, coalescing, cancellation and response guards still apply. No per-frame metadata/provider fetch.
- Gear, single camera start/stop, preload, full-frame geometry, DFC/reference image epochs, session generations and explicit history-reopen camera-stop behavior remain.

## Changed paths

Production:
- `src/main.ts`
- `src/recognition/live-candidate.ts`
- `src/ui/style.css`

Tests:
- `tests/unit/live-candidate.test.ts`
- `tests/browser/live-candidate.spec.ts`
- `tests/browser/candidate-immersive.spec.ts`
- `tests/browser/immersive-routes.ts`
- `tests/browser/combined-camera-ui.spec.ts`
- `tests/browser/continuous-camera.spec.ts`
- `tests/browser/dfc-metadata.spec.ts`
- `tests/browser/format-legality.spec.ts`
- `tests/browser/reference-image.spec.ts`
- `tests/browser/scan-history.spec.ts`
- `tests/browser/set-badge.spec.ts`
- `tests/browser/smoke.spec.ts`

Report: `docs/reports/scan-view-save.md`.

No dependencies, configuration, shared contracts or provider/recognition model assets changed. Existing behavioral cases were adapted, not deleted/skipped or relaxed: explicit labels, modal close/navigation, unchanged camera geometry, retained saved-candidate visibility, scoped result-panel assertions, delayed-rearm observation, and deterministic Japanese history naming.

## Actual RED → GREEN evidence

All camera/worker/provider scenarios below are explicitly synthetic or replayed fixtures, not live recognition/provider evidence.

1. `MVP_PORT=4295 npx playwright test tests/browser/live-candidate.spec.ts -g 'detail freezes' --project=desktop`: **RED**, 1 failed, timeout awaiting absent `詳細を見る`. After implementation, `MVP_PORT=4295 npx playwright test tests/browser/live-candidate.spec.ts -g 'detail freezes'`: **GREEN**, 2 passed. Covers frozen A, delayed verified B, A saved once, B on close, focus restoration and live camera control.
2. `npx vitest run tests/unit/live-candidate.test.ts` with pending preservation absent: **RED**, new assertion `live.current(b)` expected true, received false. Implemented preservation; same command **GREEN**, 7 passed. Tests stationary A suppression plus sustained-absence rearm.
3. `MVP_PORT=4295 PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser/live-candidate.spec.ts -g 'detail manual version' --project=desktop`: **RED**, missing correction button. Added explicit history-free manual flow; subsequent full browser run passed both viewport projects.
4. `MVP_PORT=4295 PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser/live-candidate.spec.ts -g 'optional save retains' --project=desktop`: **RED**, saved A hidden on close. Retained the latest verified snapshot and added brief button/status feedback; subsequent browser run passed both projects.
5. `MVP_PORT=4295 PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser/live-candidate.spec.ts -g 'reopening detail manual' --project=desktop`: **RED**, expected `foil`, received `nonfoil`. Reused the existing same-Oracle physical selection/finish; subsequent browser run passed both projects.
6. Full browser regression exposed slow A Japanese retrieval blocking B after retained save. Separate display-lookup request queue fixed it; late A/B regression passed both projects afterward.
7. Compact long-DFC and large-text checks detected actual clipped content; restoring static identity layout removed the redundant compact eyebrow and retained all strict viewport/52×20/font-size assertions. Subsequent full run passed those cases.
8. Retained candidates exposed ambiguous formerly global result assertions; scoped them to `.result`. A history test's English-only expectation raced verified Japanese retrieval; it now explicitly waits for the fixture's Japanese name. `MVP_PORT=4295 PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser/scan-history.spec.ts -g 'session history preserves'`: **GREEN**, 2 passed.

Additional browser coverage checks image/name Enter/Space, focus trap and Escape, native header pointer capture versus scrolling/body pointer input, lookup prefill/search without history, closing before delayed B verification, duplicate save after closing, and retained manual override. Existing held Enter/Space, blur/window blur/pointercancel, sticky metadata, stale JP/image/FX, missing/zero price, all formats, settings, preload and history-limit tests remain.

## Final validation

- `npm ci`: passed; 87 packages added, 88 audited, 0 vulnerabilities.
- `npm run check`: passed; strict typecheck and **22 test files / 168 tests**. Final run duration 2.06s.
- `npm run build`: passed; 26 modules, 52ms Vite build. JS 58.99 kB / 20.79 kB gzip; CSS 21.24 kB / 4.81 kB gzip. This is bundle evidence, not a device latency measurement.
- `MVP_PORT=4295 npm run test:e2e`: **244 passed (1.5m)**, Chromium desktop + Chromium mobile viewport. Exit 0. This final full run used the final implementation/test files without modifications while it ran.
- `git diff --check`: passed.
- Visually inspected final 320px long-DFC compact screenshot, 390px detail sheet, frozen/saved A, and full long-DFC names/face switches. Screenshots are labelled synthetic by their test context; no live camera/model claim.

Raw logs preserved in ignored `test-results/scan-view-save-evidence/`: final E2E, unit RED, manual-flow RED, retain-on-save RED, reopen-override RED and deterministic history GREEN. Initial detail RED is preserved in the tool transcript and detailed above.

Selected screenshots:
- `test-results/format-legality-candidate--83957-t-320px-long-DFC-SYNTHETIC--desktop/synthetic-compact-candidate-320.png`
- `test-results/format-legality-candidate--83957-t-320px-long-DFC-SYNTHETIC--mobile-viewport/synthetic-candidate-format-320.png`
- `test-results/candidate-immersive-portra-aca37-l-only-scrolling-SYNTHETIC--mobile-viewport/portrait390-expanded.png`
- `test-results/live-candidate-detail-free-741ad--close-resumes-B-SYNTHETIC--desktop/frozen-A-saved.png`
- `test-results/live-candidate-detail-free-741ad--close-resumes-B-SYNTHETIC--desktop/resumed-B.png`

Screenshots use Playwright `testInfo.outputPath`/`info.outputPath`, inside ignored `test-results/`; no hardcoded external screenshot directory in the adapted immersive tests. Relevant evidence includes compact candidates at 320/390/440, long DFC/full face names, expanded detail, frozen saved A, resumed B, body scroll and keyboard/short visual viewports.

## Limits and handoff

- Real camera/model accuracy, live Scryfall/FX behavior, iPhone Safari/PWA, Android hardware, thermal/latency and human-device tests: **NOT RUN**. Chromium mobile viewport is not a phone, and no desktop WebKit run is claimed.
- Independent TEST/QA and a separately integrated pinned candidate: **NOT RUN**; this sole-writer task leaves an uncommitted diff for coordinator integration, as instructed.
- No camera-image upload, fabricated recognition/price, added dependency, committed secret, public deployment or external messages.
