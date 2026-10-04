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
