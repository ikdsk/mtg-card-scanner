# Candidate-first implementation candidate

2026-10-04. Worktree `/Users/dikeda/workspace/mtg-card-scanner-worktrees/candidate-first`,
branch `feat/candidate-first`, base/HEAD `85b05ad48311d65de538f00dd220cd2d45d741be`.
Changes are unstaged; no commit/push/merge/deploy. The user's latest product change
explicitly authorizes this contract/test replacement. Parent independent TEST/QA
is still required; this is implementer evidence, not an independent review.

## Exact behavior

Camera and file recognition have **no automatic acceptance**. Removed the obsolete
StabilityGate implementation, ContinuousScan auto guard and app openId acceptance
path. The frame Candidate type remains. LiveCandidate's default cosine≥.50 and
one-observation proposal remain; margin is diagnostic only. File input now performs
one inference, presents its proposal and waits for confirmation. High scores,
repeated frames and debug reset never commit a recognized card. Name search keeps
its deliberate manual semantics and does not create scan history.

The nonmodal `もしかして？` panel stays in normal document flow inside scan actions.
Persistent `これです`/`違う` controls precede progressive information so they stay
reachable at 390px. It shows a reused full-card ReferenceImage (including DFC,
load failure and safe URL protections), verified Japanese display name, English
Oracle name, physical expansion name/code, collector number, language/default
supported finish, overseas approximate JPY primary/USD secondary, and reused paper
format icons. Unusable formats are grey; restricted/unknown stay distinct.
Japanese display prefers a verified same-Oracle Japanese printing of the same
set/number, then another verified Japanese printing. Missing printed_name or lookup
failure is explicitly unavailable; English is never relabelled or translated.
Japanese display does not select a different physical image/price/expansion.

Candidate-only ResultSession clears quote/FX on identity changes and guards late
responses with selection tokens. Prices use the exact physical printing and
supported default finish (nonfoil preferred); finish/language remain unconfirmed
physical assumptions until manually checked. Null is distinct from zero. No FX
means truthful USD-only output, no fixed rate. Source text distinguishes Scryfall
response confirmation/cache from unavailable price update time, and displays
Frankfurter/ECB latest published rate/date. Candidate display has no write path
to confirmed session, physical controls or history.

Exact-card and same-Oracle printing-list lookups coalesce/cache successes/failures
for 60s, max 100 entries each; superseded pending lookups abort. Existing provider
validation, bounded cache, 12s timeout, rate scheduler and 429 cooldown are reused.
A separate candidate Repository queue prevents a slow confirmed printing-list
lookup from blocking B's proposal. Both instances share the provider scheduler;
explicit confirmation may fetch the card/list again into the confirmed Repository
cache. Candidate prices reuse the exact-card snapshot. FX is globally coalesced
and uses existing one-hour provider caching; its public USD/JPY rate can be reused
across cards. Stable same-version frames only update raw similarity: six frames
made exactly three provider requests in the synthetic one-page case (card, list,
FX), with one card request. Pagination can require more calls per Oracle; no calls
are scheduled per frame and information never blocks inference.

`これです` pins proposal version/printing identity and verified metadata, records
one event and keeps camera/green quad/one-inflight inference running. Stationary
confirmed Oracle/printing jitter remains suppressed until sustained absence,
different confirmed card or explicit new context. `違う`/absence rearm, settings
revision invalidation, stop/restart/background protections remain. QA-LIVE-001
held Space/Enter snapshots, repeat suppression, pointer identity and cancellation
protections are retained. No candidate-triggered focus request or result scrolling.
Explicit history/manual result viewing retains existing deliberate reveal behavior.

Debug auto score/margin/streak controls and defaults are removed, with no hidden
auto-enable. Remaining controls: tentative cosine .50 [0,1], delay 180ms [0,2000],
absence count 3 [1,20], absence elapsed 600ms [0,10000], overlay expiry 1500ms
[100,10000]. Counts/times are integers. Tentative score no longer has an obsolete
auto-score relationship. Read-only numeric score/margin remain. Setting changes
preserve live stream, confirmed history/manual finish and accepted suppression.
Model/runtime/worker/detector and geometry logic are unchanged.

## Actual RED → GREEN and intermediate findings

All camera pixels, worker replies, metadata, prices, FX and reference images in
these tests are **SYNTHETIC**. They establish application behavior only.

- `npm ci`: success, 87 packages added, 88 audited, zero vulnerabilities.
- Before product edits, `npm run build`: passed.
- RED `MVP_PORT=4253 npm run test:e2e -- --grep 'high score repeated' --project=desktop`:
  1 failed, expected zero history rows after ≥5 high-score frames, actual one.
  GREEN after removing camera/file auto paths: 1 passed (2.2s).
- RED `MVP_PORT=4253 npm run test:e2e -- --grep 'rich current candidate' --project=desktop`:
  1 failed, verified Japanese name absent. After progressive rich-panel wiring,
  `--grep 'rich current candidate|high score repeated'`: 4 passed (3.7s), desktop/mobile.
- First full E2E: 87 passed / 17 failed (47.8s). Kept failure artifacts in
  `first-full/`. Failures exposed obsolete auto-result expectations, hidden empty
  candidate widget collisions with existing global selectors, confirmation below
  mobile viewport, and an accidentally duplicated confirmation in the updated
  combined test. Fixed behavior/DOM/layout and honestly updated confirmation-only
  test operations. No retries, skips, threshold relaxation or unrelated assertion
  deletion. Targeted run: 18 passed / 2 failed (11.9s); remaining failures concerned
  newly deliberate result viewing, corrected to scroll the stable result container.
- `--grep 'candidate missing|late A Japanese|recognized candidate'`: 6 passed /
  2 failed (9.3s). This was a real new RED: confirmed A's delayed list serialized
  B's card request. Separating candidate Repository queue produced
  `--grep 'late A Japanese'`: 2 passed (3.8s), without weakening B metadata/history
  expectations. Source metadata can finish independently for confirmed A; this
  never changes its physical selection/history or B's candidate fields.
- First expanded final E2E: 108 passed / 4 failed (42.2s), retained in
  `final-playwright/` and `e2e.log`. The updated repeated-file helper had read the
  previous hidden candidate name before current metadata was ready; confirmation
  truthfully refused, leaving one history row. The delayed-reference test tried
  scrolling a heading replaced by progressive renders. Helper now waits for a
  visible current English name; scroll uses the persistent result container.
  No product safety check was weakened. `--grep '101 deliberate|recognized result shows'`:
  4 passed (17.0s), artifacts/log in `harness-green/` and `harness-green.log`.

TDD limits: core confirmation-only and rich display had targeted pre-implementation
RED; the queue isolation fix has a recorded adversarial RED/GREEN. Expanded missing
metadata/FX/zero, focus, request-count and visual assertions were added after the
initial wiring; this report does not claim a separate pre-implementation RED for
every assertion. Obsolete auto tests were replaced with confirmation-only and
one-observation tests, preserving corner/low-quality, rearm/interrupted absence,
manual/price/image/focus/scroll/history-cap and keyboard/pointer protections.

## Final validation

- Final `npm run check`: typecheck passed, **158 tests / 19 files passed** (2.05s).
- Final `npm run build`: passed; JS 46.76 kB / gzip 17.21 kB, CSS 9.80 kB /
  gzip 2.81 kB. Bundle sizes are not latency/device evidence.
- Final `MVP_PORT=4253 npm run test:e2e -- --output=/Users/dikeda/workspace/mtg-card-scanner-research/candidate-first/final-rerun`:
  **112 passed (42.6s)**, desktop Chromium plus 390px mobile viewport projects.
- `git diff --check`: passed. Own Playwright preview processes exited;
  final port 4253 listener check returned no listener. No other server stopped.
- Known intermittent `smoke.spec.ts:75` timeout: **did not recur** in the full runs
  here; the unchanged test passed on desktop/mobile. Historical instability is
  not declared resolved and no wait/retry/skip was added to that test.

Evidence root (outside git):
`/Users/dikeda/workspace/mtg-card-scanner-research/candidate-first/`.
Final logs: `final-check.log`, `final-build.log`, `final-e2e.log`; final artifacts:
`final-rerun/`. Prior failures remain in `first-full/`, `races/`,
`final-playwright/`, with logs for expanded/targeted runs. Initial core RED outputs
remain in the tool transcript; no claim that overwritten default test-results
contain the initial RED traces. Screenshots use portable Playwright `info.outputPath`.

Inspected actual full-page desktop 1280×900 and 390×844 rich tentative screenshots
from the expanded run, then final-rerun desktop/390px `rich-panel.png` and 320×740
`rich-tentative-320.png` (also inspected the 320px panel crop). Final files live
under `final-rerun/live-candidate-rich-curren-72292--image-expansion-SYNTHETIC--{desktop,mobile-viewport}/`;
`rich-tentative.png`, `rich-tentative-320.png`, `rich-panel.png`, and
`rich-panel-320.png` are available. Full-page images have an explicit SYNTHETIC
watermark; the reference image itself says TEST. Large letterboxed camera/green
synthetic quad remain separate from the white readable candidate panel. 320/390px
names, expansion, price/source/FX and wrapped icon rows do not overflow. Confirmation
controls are at the panel top. Reading the complete rich panel requires deliberate
scrolling on these small screens; the app does not scroll/focus it automatically.
No phone recognition/performance inference follows from these images.

## Changed paths

- `src/main.ts`: confirmation-only camera/file paths and independent rich candidate state.
- `src/recognition/settings.ts`, `gate.ts`; deleted `continuous.ts`: obsolete automatic behavior/defaults removed; frame type retained.
- `src/ui/format-legality.ts`, `style.css`: unique disclosure ID and responsive candidate layout.
- `tests/unit/recognition.test.ts`, `recognition-settings.test.ts`, `continuous-scan.test.ts`: intentional contract replacements retaining protection cases.
- `tests/browser/live-candidate.spec.ts`, `continuous-camera.spec.ts`, `scan-history.spec.ts`, `combined-camera-ui.spec.ts`, `reference-image.spec.ts`, `smoke.spec.ts`: candidate/confirmation operations, race/missing/zero/request/visual coverage; unrelated regressions retained.
- `docs/contracts.md`, this report: latest user-authorized behavior and evidence.

No dependencies/package/lockfile/config changes, no private images/credential reads,
image upload, purchases, other-worktree writes, port 4195 interaction or deployment.
Real camera recognition/provider accuracy, iPhone Safari/Android device behavior,
startup/scan/mobile/thermal performance: **NOT RUN**. Desktop Chromium mobile
viewports are not phone evidence. Parent must pin the combined candidate and run
independent TEST/QA; no release approval is claimed.
