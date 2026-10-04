# Live candidate confirmation combined candidate

2026-10-04. Branch `feat/live-candidate-confirmation`, base/HEAD
`db9264326997fc1c43050dcba656a1e9adce8248`. Prior continuous-camera-overlay patch
was already present and retained; it was not reapplied. All changes remain unstaged;
no commit/push/merge/deploy, other-worktree writes, 4195/Tailscale interaction,
private image access or image upload. The latest user explicitly authorized this
contract update. Independent TEST/QA of the combined candidate is pending.

## Behavior

The compact proposal lives between Start/Stop and file selection, on a light panel.
One valid observation at cosine ≥.50 presents `もしかして？`, name/reference thumbnail
when verified metadata arrives, raw `類似度 0.623`, `これです`, `違う`. No modal,
focus trap, candidate-triggered scroll/focus, unconfirmed history/price/selection
changes or capture stop. Latest diagnostic cosine/margin is shown separately.
Green geometry does not imply correct identity; similarities come directly from
worker embedding nearest-neighbor cosine `score` and distinct-Oracle `margin`,
not probability/calibration or test expected IDs.

Automatic acceptance remains .75 + .025 margin + two same-printing observations.
Explicit confirmation uses verified exact-ID Repository metadata, joins the
continuous Oracle duplicate guard, updates history and keeps live capture. Missing
metadata refuses truthfully. Pointerdown and Enter/Space capture immutable identity
and version; replaced evidence cannot confirm another card. Dismissed/replaced
metadata callbacks cannot resurrect a proposal. Dismissal suppresses the stationary
Oracle identity until valid different context or sustained absence. Confirmed
identity suppression survives parameter changes; explicit new scan context clears
it. File input retains finite auto repeats but proposes on its first observation.

Snapshot requests are coalesced, cache successes/failures for 60 seconds (100 max),
use existing provider rate limits/cache, and abort superseded pending requests.
The abort is necessary because Repository's serialized client queue would otherwise
let a slow tentative lookup block a later strong accepted lookup. Reference image
URLs are limited to HTTPS Scryfall hosts. No price/FX request before acceptance.
Live announcements are generic, not per-score, rate-limited to once per 2 seconds.

## Debug settings

Collapsed panel follows search, preserving initial camera/search controls. Values
are this-tab memory only; reload resets. No persistent storage or eval. `change`
commits a valid control value; reset reapplies defaults and resets evidence.

| Control | Default | Bounds |
|---|---:|---:|
| Tentative score | .50 | 0–1 |
| Auto score | .75 | 0–1 |
| Auto distinct-Oracle margin | .025 | 0–1 |
| Auto same-printing observations | 2 | integer 1–10 |
| Scheduling delay | 180ms | integer 0–2000ms |
| Absence rearm count | 3 | integer 1–20 |
| Absence rearm elapsed | 600ms | integer 0–10000ms |
| Overlay stale timeout | 1500ms | integer 100–10000ms |

Score/margin UI steps .001; all finite values within bounds accepted. Invalid,
empty, nonfinite, out-of-range, fractional integer and tentative>auto values reject
with explanatory status and restore the actual current value. Changes reset gate
streak/pending/absence/geometry, increment evidence revision, preserve confirmed
manual state/history and accepted duplicate guard, and never restart the camera.
Already scheduled delay completes; later schedules use the current value. File
auto repetition stays bounded at two, even if debug auto count is >2. Detector
minCornerConfidence is deliberately absent because it is not wired end-to-end.

## Actual RED/GREEN evidence

All new fixtures are SYNTHETIC, including camera canvas, worker results, provider
metadata and prices. They prove application logic, not real recognition/provider
accuracy or device performance.

- `npm ci`: success, 87 packages, audit 88, zero vulnerabilities.
- `npx vitest run tests/unit/live-candidate.test.ts`: initial RED missing module;
  GREEN 1 test. New-context dismissal test RED 1 failed / 2 passed; GREEN 3.
  Explicit scan reset test RED missing newContext (1 failed / 3 passed); GREEN 4.
- `npx vitest run tests/unit/recognition-settings.test.ts`: RED missing module;
  GREEN combined with continuous guard: 5 tests across 2 files.
- `npx vitest run tests/unit/candidate-metadata.test.ts`: RED missing module;
  GREEN coalescing/cache/failure-cache test.
- Initial browser behavior test RED: missing debug summary, 30s timeout. After
  wiring, desktop+390px GREEN 2. Expanded confirmation/dismiss/pointer/settings
  coverage GREEN 8.
- First full `MVP_PORT=4241 npm run test:e2e`: 82 passed / 6 failed. Preserved
  old assertions. Fixed initial-search displacement by placing settings after
  search and compacting diagnostics; fixed stale snapshot queue by aborting pending
  obsolete requests. Targeted existing suites then passed those six assertions.
- Targeted suite: 33 passed / 1 failed (auto-margin reset). An overlapping attempted
  Playwright run was rejected for occupied 4241 and deleted trace paths; do not use
  that run's trace artifacts as clean evidence. Isolated rerun reproduced the real
  auto-margin failure: stale-frame early return skipped future scheduling. Moved
  scheduling into finally; targeted margin/inflight/file suite GREEN 6.
- First file test failed because its PNG fixture could not decode; replaced harness
  PNG with canvas-generated synthetic PNG. This is not a product RED. Confirmation
  now invalidates old evidence; file repeat cannot undo confirmed manual finish.
- Screenshot inspection found low contrast in the original dark proposal/debug panels
  and offscreen mobile confirmation controls. New viewport/contrast regression RED
  (button viewport ratio 0); moved proposal inside camera actions before file input,
  added light panels; targeted one-observation/file/viewport suite GREEN 6.
- New browser coverage checks each debug control's effect, invalid/reset, immutable
  pointer identity, keyboard confirmation, unavailable metadata, stale frame discard
  plus continued capture, manual/history preservation, coalesced network, 320px width,
  and existing strong-auto/continuous/rearm behavior.

Process limit: core modules and primary proposal UI had recorded RED before wiring;
some expanded browser race/control assertions were added after wiring, and the valid
file race did not have a recorded failing product run before its fix. This report
does not claim perfect one-behavior-first TDD for every wiring change. These are
implementer tests, not independent TEST/QA certification.

## Final validation and visual evidence

- Final `npm run check`: typecheck passed, **158 tests / 19 files passed**.
- Final `npm run build`: passed; initial JS 47.09 kB (gzip 17.42 kB), CSS 8.98 kB
  (gzip 2.67 kB). Bundle size is not latency/device performance evidence.
- Final `MVP_PORT=4241 npm run test:e2e`: **94 passed (34.6s)** across desktop and
  mobile viewport projects, retaining prior tests/assertions. Intermediate final
  runs passed 90 then 92 before added validation/visual regressions.
- `git diff --check`: passed. Own Playwright preview server exits after the run;
  port 4241 is no longer listening. No changes staged.

Evidence root outside git:
`/Users/dikeda/workspace/mtg-card-scanner-research/live-candidate-confirmation/`.
Final commands/results are in `check.log`, `build.log`, `e2e.log`; portable
Playwright outputPath artifacts copied to `final-playwright/`. Earlier targeted
artifacts copied to `first-full-e2e-and-targeted/` are mixed/intermediate evidence,
not the final candidate. Tool transcripts retain actual initial RED output.

Inspected final desktop 1280×900 and mobile 390×844 `initial.png`,
`debugopen.png` (full page), `tentative.png`, `confirmed.png` from
`live-candidate-one-observa-71df1-amera-stays-live-SYNTHETIC--{desktop,mobile-viewport}/`,
and narrow 320×740 `tentative-320.png` from the coalescing test. These are labelled
synthetic canvas camera/worker/provider/image evidence. The green synthetic quad
is not a real detected card. Initial camera remains large and controls/search
reachable. Proposal is readable on a light panel, appears before the file selector,
and does not cover camera geometry. On 390×844 the confirm button is in the
viewport without candidate-driven scroll; at 320×740 shorter viewport the proposal
continues in document flow and can require manual scrolling. Debug labels, real
values/defaults/bounds and reset are readable on desktop/mobile. Long metadata or
short/landscape screens may also require manual scrolling; no fixed overlay or
focus trap is used. No phone Safari/device/performance claim follows from these
screenshots.

## Paths and limits

New implementation: `src/recognition/live-candidate.ts`,
`src/recognition/settings.ts`, `src/ui/candidate-metadata.ts`.
Additional edits: `src/main.ts`, `src/recognition/gate.ts`,
`src/recognition/continuous.ts`, `src/ui/detection-overlay.ts`, `src/ui/style.css`,
`docs/contracts.md`, this report.
New tests: `tests/unit/live-candidate.test.ts`,
`tests/unit/recognition-settings.test.ts`, `tests/unit/candidate-metadata.test.ts`,
`tests/browser/live-candidate.spec.ts`. Prior patch's changed paths remain in the
combined unstaged diff and are listed in `continuous-camera-overlay.md`.

No new dependencies/config/lockfile changes. No detector model/worker threshold
changes, training or calibration. Real phone/iPhone Safari/Android, physical camera
removal, sustained speed/thermal behavior and actual accuracy: **NOT RUN**.
No real public model probe was required for this incremental change. Previous
patch's public-fixture evidence is contextual only; it does not validate this change.
Coordinator must pin and independently verify the combined candidate before release.
