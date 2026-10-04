# Continuous camera and detection overlay candidate

2026-10-04. Branch `feat/continuous-camera-overlay`; HEAD/base remains
`db9264326997fc1c43050dcba656a1e9adce8248`. Unstaged candidate; no commit,
push, merge, deployment or other-worktree edits. Independent QA is still required.

## Behavior and decisions

Camera acceptance no longer stops tracks or inference. The complete delivered
frame still uses contain and uniform max-edge-1024 capture; the stable viewport
is 50svh, minimum 300px, maximum 560px. Start/Stop and file input precede the result
so Stop remains reachable after live acceptance. No automatic permission request.
Live events do not reveal, focus, or scroll the result. Deliberate file/manual/history
selection keeps its reveal behavior; history inspection and name search stop capture.
JPY, USD, format badges, reference images, physical overrides and document history
remain available. Late price/FX updates retain the previous measured price-region
height to preserve even a document-bottom reader's exact scroll position.

`ContinuousScan` retains the existing two same-printing-ID gate and its cosine .75 /
distinct-oracle margin .025 thresholds. It suppresses accepted-identity repeats using
worker `scryfallOracleId`, falling back to printing ID only if missing. Different
stable identities create events. Same-card re-presentation requires ≥3 consecutive
completed detector results with `cardPresent:false`, spanning ≥600ms. A card-present
ambiguous/low-score/invalid-corner result interrupts absence. This conservative
policy is uncalibrated; a physical swap without observed absence can be suppressed.

Every accepted live event reserves a history row immediately (100-event cap).
Only verified provider metadata replaces its actual candidate ID/status. A lookup
superseded before metadata arrives remains visibly interrupted, without fabricated
card metadata and without reopening controls. The current event resets selection
generation and aborts the previous metadata request. Printing-list/detail generation
and existing price/FX generation/revision checks reject old responses. Stationary
printing jitter cannot refetch metadata or undo a manual physical selection. Overrides
update only the current history entry. File scans remain finite two-repeat inference,
not a continuous artificial file loop.

The canvas paints only valid detected normalized corners, independently of identity
acceptance: four finite [0,1] pairs, area≥.01, pair distance²≥.0004, strictly convex
order. It does not clamp or fabricate corners. Coordinates map through the contain
content rect, including letterbox offsets. CSS dimensions and DPR determine backing
size on each rAF; video dimensions are read anew for resize/rotation. Lost/invalid
geometry clears on response; frame geometry older than 1500ms clears even if a delayed
response has just arrived. Stop/errors/background/pagehide/new stream clear it.
Detection status is neutral, distinct from identity acceptance, and updates only on
visibility transitions. rAF paints latest geometry; inference is still one inflight
frame with a 180ms post-completion interval. There is no 60fps detector claim.

Primary source: [CollectorVision official playground](https://hanclinto.github.io/CollectorVision/applet_example.html),
fetched upstream `upstream-scanner-applet.mjs` lines 492–559 (rAF, normalized
`cornersValid` quad and `#22c55e`). Fetched file SHA-256:
`e73bb54878b5b504f5529cdca14b92d05f3d927c5bad8bb3aa2ffe73ec185fe0`.
Local worker source at lines 119–170, 810–835, 846–854, 1031–1129 confirms normalized
full-frame geometry, usable-quad semantics and absence flags. Catalog v2 emits
`scryfallOracleId` (worker line 777), rather than assuming an invented Oracle field.

## Validation and RED/GREEN evidence

All unit/browser synthetic fixtures are explicitly labeled. They do not establish
recognition accuracy, live provider correctness, or phone performance.

- `npm ci`: success, 87 packages added, audit 88, 0 vulnerabilities.
- `npx vitest run tests/unit/continuous-scan.test.ts`: initial RED missing module;
  GREEN 1 test. Added sustained-absence behavior: RED 1 failed / 1 passed (expected
  re-presented `a`, actual null); implemented absence/rearm: GREEN 2 tests.
- `npx vitest run tests/unit/detection-overlay.test.ts`: RED missing module;
  GREEN 2 tests for valid/malformed/degenerate quads and letterbox mapping.
- `npx vitest run tests/unit/scan-history.test.ts`: reserved-event RED 1 failed /
  3 passed (`reserve` unavailable). Implemented reservation/status: combined
  history/continuous run GREEN 6 tests.
- First `npm run check`: 147 tests passed after type fix. Final `npm run check`:
  typecheck passed; **150 tests / 16 files passed**.
- First `MVP_PORT=4235 npm run test:e2e`: **56 passed / 8 failed**. Failures were
  superseded fixed-result ≤96px viewport, preview-element ratio equality, and
  camera-stopped-after-acceptance assertions. Adapted only those requirements;
  retained full-frame input quadrant/ratio, explicit-stop/background, manual,
  provider-race, focus and scroll assertions. Added actual rendered-canvas pixel
  checks at DPR2 across landscape/portrait input and viewport rotation/resize.
- Expanded suite: 66 passed. Targeted camera/overlay suite: 6 passed.
- Later full suite: **67 passed / 1 failed**: unrelated late-FX scroll moved
  1623→1611px on mobile at document bottom. No assertion relaxation. Preserved
  measured price-region height; targeted original test GREEN **2 passed**.
- Final `npm run build`: success. No dependencies/config/lockfiles changed.
- Final `MVP_PORT=4235 npm run test:e2e`: **68 passed** (desktop + mobile viewport).
  Includes continuous A→B, no per-frame duplicate, manual finish/printing jitter,
  removal/re-presentation, delayed metadata, expired/lost/malformed outline,
  pagehide and existing explicit stop/start/visibility tests.
- `git diff --check`: passed.

Process limitation: camera-flow browser acceptance/race coverage was added after
initial wiring. The module/rearm/history and scroll-fix RED/GREEN commands above
are actual evidence; this report does not claim every wiring edit followed strict
one-case-first TDD. Independent TEST/QA has not run this unstaged candidate.

## Real worker and rendering evidence

Evidence root (outside git):
`/Users/dikeda/workspace/mtg-card-scanner-research/continuous-camera-overlay/`.
Commands/logs: `check.log`, `build.log`, `e2e.log`,
`e2e-before-scroll-fix.log`, `scroll-fix.log`, `real-worker-probe.mjs`,
`real-worker-probe.json`. The first probe's debug-section harness timeout is
preserved in `real-worker-probe-first-harness-failure.json`; corrected harness
opens Information first. No product error was reported by the successful probe.

`node /Users/dikeda/workspace/mtg-card-scanner-research/continuous-camera-overlay/real-worker-probe.mjs` exercised real Chromium
getUserMedia using the existing public `mvp-fixtures/classic-camera.y4m`, real local
WASM detector/embedder/catalog and live provider GETs. Existing assets/vendor were
copied read-only from result-card-image into this worktree's ignored paths; no model
download was needed. External model hosts were blocked. No private photo was used.

Observed: real green outline follows the public reference card; accepted identity
Lightning Bolt; inferred printing SUM #162 en is a candidate, not proof of physical
printing. Video 1280×720 remained live after acceptance, mobile CSS region 390×422,
scrollY=0, history stayed 1 across eight completed real inferences (one acceptance event), explicit
Stop ended tracks and cleared outline. No remote-model request or non-GET request.
This is one public-fixture smoke probe, not a real camera accuracy or speed study.

Screenshots inspected:
- `real-mobile-initial.png`, `real-mobile-detected.png`, `real-mobile-accepted.png`
- `real-desktop-accepted.png`
- `synthetic-mobile-initial.png`, `synthetic-mobile-scanning.png`, `synthetic-mobile-accepted.png`
- `synthetic-desktop-initial.png`, `synthetic-desktop-scanning.png`, `synthetic-desktop-accepted.png`
- copied DPR2 rotated landscape/portrait overlay screenshots under `synthetic-geometry/`.

The mobile camera occupies half the viewport and letterboxes rather than crops;
Start/Stop are visible below it, with the latest result beginning below the controls.
The real green line aligns with the card in both inspected viewport sizes. At shorter
landscape viewports the 300px minimum requires document scrolling; camera content
remains contained. Real camera phones, iPhone Safari, Android, physical orientation,
thermal/sustained performance, recognition calibration and physical same-card
removal tests: **NOT RUN**. Desktop Chromium/mobile viewport is not phone evidence.

## Changed paths

`src/main.ts`, `src/recognition/adapter.ts`, new `src/recognition/continuous.ts`,
new `src/ui/detection-overlay.ts`, `src/ui/style.css`, `src/ui/scan-history-model.ts`,
`src/ui/scan-history.ts`; new `tests/unit/continuous-scan.test.ts`,
new `tests/unit/detection-overlay.test.ts`, `tests/unit/scan-history.test.ts`,
`tests/unit/session.test.ts`; new `tests/browser/continuous-camera.spec.ts`,
`tests/browser/camera-geometry.spec.ts`, `tests/browser/camera-first-design.spec.ts`,
`tests/browser/scan-history.spec.ts`; `docs/contracts.md`, this report.

No server is intended to remain running; own 4235 servers are stopped after evidence.
No changes to port4195/Tailscale, credentials, uploads, public hosting or other checkouts.
