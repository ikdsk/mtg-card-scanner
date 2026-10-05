# Scan diagnostic removal and camera toggle

Branch: `fix/scan-toggle`
Base/HEAD: `5f3e904be8e5a247f73004e9b05d5c09de3a207b`
No commit, push or deployment. All changes are uncommitted in the dedicated `scan-toggle` worktree.

## Scope

- `src/main.ts`: detach detection/score diagnostics from camera information; preserve their inference updates and detection overlay. Keep camera/error/model statuses. One persistent camera SVG button reads `スキャン開始` when idle and `停止` while pending/active. Stops invalidate generation, release current/late tracks, and restore idle label. An active guard also prevents alternate start actions from duplicating initialization.
- `src/ui/style.css`: inline icon alignment and retry-wrap selector adjusted for removed stop button. Existing gear and toolbar 44px rules preserved.
- `tests/browser/scanner-toolbar.spec.ts`: diagnostic absence regression and synthetic pending-camera cancellation, button identity, explicit permission request, restart and visibility lifecycle test; toolbar uses a dynamic-name regex and compares only the two remaining toolbar controls.
- Existing selectors updated only in camera-first-design, camera-geometry, candidate-immersive, combined-camera-ui, continuous-camera, dfc-metadata, format-legality, live-candidate, recognition-preload, scan-history, set-badge and smoke browser specs. Old disabled separate-stop expectations now require enabled idle start after auto-stop. Candidate/format production code unchanged.

## TDD evidence (actual commands and outcomes)

1. `npm ci`: PASS, 87 packages, 0 vulnerabilities.
2. `npm run build` then `MVP_PORT=4292 npx playwright test scanner-toolbar --project=desktop -g 'omits diagnostic'`: RED, 1 expected failure; camera-info included `カード検出なし` and `類似度 — · margin —`.
3. Detach diagnostic nodes; same build/test commands: GREEN, 1 passed.
4. `MVP_PORT=4292 npx playwright test scanner-toolbar --project=desktop -g 'one camera SVG'`: RED, 1 expected failure; existing button still read `カメラでスキャン`.
5. Implement same-button toggle; `npm run build` then same focused test: GREEN, 1 passed. Late granted stream is ended and cannot restore video after stop; hidden document restores idle; visible document does not request permission automatically.
6. `npm run check`: PASS, typecheck and 22 files / 167 unit-regression tests.
7. `npm run build`: PASS.
8. `MVP_PORT=4292 npm run test:e2e`: PASS, 226 tests across desktop/mobile-viewport Chromium (1.2m), including all toolbar sizes, inference overlay, permission denial/retry, background stop and stale callbacks.
9. `git diff --check`: PASS.

## Visual evidence and limits

Inspected `artifacts/scan-toggle/header-idle-320.png` and `artifacts/scan-toggle/header-active-320.png`: camera SVG/start or stop at upper left; gear aligned at upper right; no diagnostic row below camera; actual status/error/model information remains. Active synthetic outline remains visible. Candidate panel untouched.

SYNTHETIC workers, camera streams and provider fixtures prove browser lifecycle/presentation, not real recognition accuracy, real providers or mobile performance. Desktop Chromium mobile viewport is not a phone. Human iPhone Safari/Android camera tests: NOT RUN. Independent QA and separate pinned combined-candidate validation are coordinator follow-ups; this assignment authorizes only this worktree, no commit. No task blocker found.

## Parent integration blocker: compact DFC layout (2026-10-05)

Branch `fix/scan-toggle`; pinned starting HEAD `b9a8711a890d8ef1590774e84c6a1c788bf976a7` (compact badges plus toggle). This follow-up remains uncommitted; no push, deployment or additional worktree.

The parent's real Delver back-face probe found `.tentative .format-icon` viewport ratio 0 at 390×844. The reference-image front/back buttons occupied the narrow 60px image column; full face labels wrapped into many lines. The max-content first grid row grew beyond the compact summary budget, placing price and badges inside hidden internal scroll. Earlier badge fixtures had only a single face and missed this physical DFC shape.

Changed paths for this follow-up:
- `src/ui/style.css`: hide candidate face switches while collapsed; clamp compact identity name/English text to two lines only. Expanded names are unabridged, and expanded face switches occupy a full-width two-column row after badges. Existing face selection, physical reference image, badge labels/geometry and dock/camera height allocation remain intact.
- `tests/browser/format-legality.spec.ts`: retain single-face cases and add synthetic long-name DFC fixtures with per-face images and no top-level image. At 320×740, 390×844 and 440×780 require all seven badges, image, name, physical set, both currencies and confirmation visible; zero summary scroll and no overflow/price overlap. Expanded full name/face labels and back-face switching are verified alongside existing keyboard disclosure checks. Provider/camera/worker fixtures are SYNTHETIC.
- `tests/browser/dfc-metadata.spec.ts`: expand before manually switching candidate faces; every existing face persistence/price/confirmation assertion retained.
- `docs/reports/scan-toggle.md`: this defect and evidence update.

Actual TDD/validation commands:
1. `npm run build` then `MVP_PORT=4294 npx playwright test format-legality --project=desktop -g 'long DFC'`: RED, 3 failures at the first collapsed badge, viewport ratio 0 at all three widths.
2. Initial collapsed fix with the same build/test commands: collapsed checks passed, but 3 expanded badge failures exposed the same narrow-column wrapping after expansion. Full-width expanded face controls fixed that second layout symptom.
3. `npm run build` then `MVP_PORT=4294 npx playwright test format-legality -g 'long DFC'`: GREEN, 6 passed across desktop/mobile-viewport (3.7s).
4. Added explicit currency intersection, initial scrollTop=0, collapsed switch visibility and expanded full-name fit assertions; included in full suite below.
5. `npm run check && npm run build`: PASS, typecheck, 22 files/167 unit-regression tests, Vite production build.
6. `PROBE_URL=http://127.0.0.1:4199 node /Users/dikeda/workspace/mtg-card-scanner-research/compact-toggle-probe.mjs`: PASS, real worker + live provider, Delver back reference image, Japanese name, physical INR set icon and all seven exact 52×20 badges fully in viewport. Existing 4199 Vite preview was verified by process cwd to serve this worktree's newly built `dist`. Evidence: `/Users/dikeda/workspace/mtg-card-scanner-research/compact-toggle-live.json` and `compact-toggle-collapsed-verified.png`. Visually inspected that PNG: all required compact information/confirmation visible and camera area preserved.

Human iPhone Safari/Android device tests remain NOT RUN. The live probe is desktop Chromium using a public reference-image file, not a physical camera accuracy or phone performance result. Independent QA and pinned combined-candidate validation remain coordinator follow-ups. No blocker found in this focused fix.

Full-suite follow-up: the first `MVP_PORT=4294 npm run test:e2e` run returned 228 passed/4 failed. Two failures were the existing DFC manual-switch scenario clicking collapsed controls; added expansion navigation. Two were large-text/short-height USD clipping: the compact name clamp initially also matched the price `strong`, making the currency block-level. Narrowed the clamp to exclude `.candidate-price`; preserved all clipping assertions. An intermediate full rerun was interrupted after this correction to rebuild and validate one stable artifact. `npm run build` then `MVP_PORT=4294 npx playwright test candidate-immersive dfc-metadata -g 'large text|recognized back'`: GREEN, 4 passed (3.1s).

Final stable-artifact validation:
- `MVP_PORT=4294 npm run test:e2e`: PASS, all 232 tests across desktop/mobile-viewport Chromium (1.3m), including six long DFC cases and unchanged short/large-text clipping assertions. Full command output: `/tmp/scan-dfc-full-e2e-final.log`.
- `npm run check`: PASS again, typecheck and 22 files/167 unit-regression tests (`/tmp/scan-dfc-check-final.log`). Final production build passed before the final full suite.
- Parent real probe command above rerun against final 4199 dist: PASS again (`/tmp/scan-dfc-real-probe.log`); final live collapsed screenshot inspected again. Synthetic 320px compact and expanded screenshots also inspected: truncated compact English identity, unabridged expanded English/face labels, full badges and fixed confirmation controls.
- `git diff --check`: PASS. Final changes only the four follow-up paths listed above. HEAD remains `b9a8711a890d8ef1590774e84c6a1c788bf976a7`; no commit/push/deploy. No remaining focused integration blocker.
