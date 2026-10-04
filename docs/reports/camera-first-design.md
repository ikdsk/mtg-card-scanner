# Camera-first design B implementation

Date: 2026-10-04. Branch: `feat/camera-first-design`.
Base/HEAD: `eb321dcbdf7a26f2302de1e2e1355dae93953584`.
Candidate is complete, **unstaged and uncommitted** as requested. No push or deploy.

## Changes

- `src/main.ts`: compact MTG Scanner header; remove both slogans and promotional subtitle. Camera first, white result sheet, scan actions followed by readily available name search and local file input. Information/privacy, attribution, license notices and diagnostics remain available in details via the header action.
- `src/ui/style.css`: neutral black/gray camera chrome and white result sheet, independent of OS theme. Responsive 44px minimum controls, readable USD/JPY, reference image beside Japanese name/English fallback. Actual delivered camera ratio drives viewport size, with contain; portrait height is bounded by proportionally reducing width, never by cropping. Fixed results have a small neutral stopped area, without a retained private frame.
- `src/main.ts`: stopped camera explicitly labeled on recognition and result display; guide only appears while a camera stream exists. Existing track release, generation cancellation, explicit camera startup, full-frame capture, model/gate behavior and file processing remain in place. Result update restores scroll and control focus; return action scrolls to the actual primary action. Rules and price source/date details are collapsible; their open states survive updates.
- `src/ui/reference-image.ts`: shorter credit, keeping Scryfall link and reference labeling. Persistent reference DOM and DFC face behavior unchanged.
- `tests/browser/camera-first-design.spec.ts`: implementer UI coverage and reproducible evidence generation. All card/image/provider values are explicitly SYNTHETIC and only in tests. No mock card, price, camera image or live-state simulation was copied to application code.
- `tests/browser/smoke.spec.ts`: one additional click opens `カード本文・ルール` before the existing exact Japanese/English body visibility assertions. No selector/assertion changes, skips or weakening. All other existing tests unchanged.

No dependencies, root configuration, contracts, recognition models, thresholds or provider behavior changed. No other worktree, port 4195 or Tailscale configuration touched.

## TDD / actual commands

1. `npm ci`: success; 87 packages installed, 0 vulnerabilities. Lockfile unchanged.
2. `npm run build`: baseline success.
3. `MVP_PORT=4215 npm run test:e2e -- camera-first-design`: RED, 2 failed / 34 passed. The argument matched this worktree's full path, so the whole suite ran. Both new shell cases failed: expected `MTG Scanner情報・設定`, received old `MTGCARD SCANNER`. Production unchanged at this RED.
4. Shell implementation; `npm run build`; `MVP_PORT=4215 npm run test:e2e -- --grep 'functional neutral'`: first 1 passed / 1 failed (desktop search below viewport). Adjusted camera size without cropping; rerun GREEN, 2 passed.
5. Added compact-result behavior; `MVP_PORT=4215 npm run test:e2e -- --grep 'compact real'`: RED, 2 failed, missing `.result-heading h2`. Added result composition and collapsed rules.
6. Whole browser suite exposed real return-action and scroll problems (3 failed / 35 passed). Corrected return scroll target, disabled result anchoring and explicitly retained scroll on update; whole suite GREEN, 38 passed.
7. Added next-scan-in-viewport assertion: RED, mobile failed / desktop passed. Moved next-scan action immediately after selection controls, before optional rule/legality sections; targeted GREEN, 2 passed.
8. Added compact stopped-area assertion: RED, 2 failed, actual heights 378px / 219.375px versus <=96px. Result-only neutral stopped area now 72px; no effect on live preview. Whole suite GREEN, 38 passed (15.0s).
9. Final screenshot capture additionally waits for printing-list completion: targeted suite GREEN, 2 passed (2.8s).

Final verification commands:

- `npm run check`: PASS, TypeScript and 139 tests across 12 files (2.02s).
- `npm run build`: PASS, initial JS 30.61kB / gzip 12.04kB; CSS 6.17kB / gzip 2.01kB. These are build sizes, not device latency measurements.
- `MVP_PORT=4215 npm run test:e2e`: PASS, 38 tests including existing portrait/landscape full-frame camera geometry, track-stop/background handlers, DFC/printing/language/finish updates, stale response rejection and focus/scroll tests.
- `git diff --check`: PASS.

Playwright created its own temporary port-4215 preview processes and stopped them on completion. No persistent development server was left running.

## Screenshot evidence

Outside git: `/Users/dikeda/workspace/mtg-card-scanner-research/camera-first-design/`.

- `mobile-viewport-initial.png`, `mobile-viewport-loading.png`, `mobile-viewport-result.png`
- `desktop-initial.png`, `desktop-loading.png`, `desktop-result.png`
- `mobile-viewport-result-overview.png`, `desktop-result-overview.png`
- `mobile-viewport-narrow320.png`, `desktop-narrow320.png`

Initial/loading/result mobile and desktop images were opened and visually inspected. White result sheet, full reference aspect, readable prices and controls, primary next scan visible on 390×844; initial camera/search/file actions visible at 390px, 320px and desktop. Automated horizontal overflow checks cover 320px and desktop/mobile widths. Native file input may abbreviate its filename text at narrow widths; its functional label and file chooser remain usable. Screenshot cards/quotes are SYNTHETIC browser fixtures, not provider observations or recognition evidence.

## Limits / handoff

- Physical phone camera, iPhone Safari, mobile performance/latency and real recognition accuracy: **NOT RUN**. Chromium mobile viewport and synthetic camera tests are not physical-device evidence.
- Live public provider/search/image verification: NOT RUN in this task. Existing real adapters are retained; fixture tests do not certify live behavior.
- Independent TEST/QA and pinned combined-candidate validation: coordinator-owned, not performed here. No release/deployment claim.
- No implementation blocker. Work is ready as an unstaged candidate for coordinator review.
