# Candidate immersive viewport implementation

**Latest state:** the final overlay-window correction below supersedes this first
pass’s nonmodal auxiliary drawers. The candidate dock remains nonmodal.

2026-10-04. Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/candidate-first`.
Branch: `feat/candidate-first`; unchanged HEAD/base: `85b05ad48311d65de538f00dd220cd2d45d741be`.
Implementation worker: explicitly pinned `gpt-6.1-sol`. Existing intentional dirty
changes from the completed candidate-first worker were retained. No commit, push,
merge or deploy; this report is implementer evidence for parent and independent QA.

## Latest user supersession

Read `AGENTS.md`, `docs/development-plan.md`, `docs/contracts.md`,
`docs/agent-briefs.md`, `docs/reports/candidate-first.md`, and the mandatory external
`candidate-first-layout-addendum.txt` before implementation. The addendum supersedes
the previous report's full-page/natural-document layout and screenshots. Inherited
coordinator-owned contracts still describe the old normal-flow candidate, 50svh
camera and settings below search. Those layout clauses are superseded by this
user-authorized implementation; this worker did not edit the shared contract.

The app occupies the actual visual viewport, including safe-area padding. Its two
rows are a full-frame `object-fit: contain` camera and an immediately adjacent
candidate dock. Header, camera controls and status are camera overlays, with no
intervening page sections. Browser bars/keyboard height and offsets update the
shell through `visualViewport` resize/scroll events; height-dependent CSS classes
also use that viewport, rather than the larger layout viewport. Short viewports
place camera actions/settings in one row. The brand heading is visually hidden in
that short mode; all camera action targets remain visible and do not overlap.

Accessible `⌃` / `⌄` buttons expand/contract the panel, with explicit Japanese
labels, `aria-controls`, expanded state and disabled endpoint buttons. Compact
state shows the full reference thumbnail, verified Japanese and English names,
cosine similarity, approximate JPY and USD, and fixed confirmation/dismiss buttons.
The currency row uses the available full width. Expanded state retains the summary
and primary controls while showing physical expansion/code/collector/language/
finish, paper-format badges/disclosures, source/date/FX caveats, Japanese printed
information and separately labelled English Oracle rules. Missing names, text,
prices and FX remain explicitly missing. All content comes from the existing
validated repository; display Japanese never changes the physical price/image.

Intrinsically long content scrolls inside panel content; expanded details and
auxiliary drawer bodies have their own bounded scroll regions. The summary can
scroll internally for exceptionally long names or DFC controls, while confirmation,
resize and navigation controls remain outside these content regions. Normal
fixture JP/EN, score and both currencies are tested against every clipping ancestor,
including compact/expanded small-height cases, rather than merely intersecting
with the browser viewport. Expanded details are keyboard-focusable. No document
vertical/horizontal scrolling is used to reach controls.

Explicit `名前検索`, `履歴`, `設定`, `確定カード` navigation opens labelled nonmodal
auxiliary drawers. Close and Escape return focus to the triggering control. The
scanner action row and navigation stay available. Search/file input, recognition
debug settings, privacy/licensing/timing information, confirmed metadata and manual
printing/language/finish overrides remain reachable. Ordinary proposals do not
open drawers or large modals. Opening the history list preserves the live stream;
selecting an entry stops/release it before showing the result, matching the
previous history-reopen policy. Search submission also stops capture. Deliberate
confirmed-card/manual viewing can retain the live stream, as before. File/camera
start closes an auxiliary drawer and resets its scan context.

No auto-confirm or automatic result reveal was added. High scores/repeated frames
still cannot confirm a card. Candidate version/identity, pointer and held-key
snapshot/cancellation guards, stale metadata/price/FX protections, one-inflight
recognition, exact physical selection and tab-only history semantics remain.

## TDD and intermediate evidence

All camera pixels, worker observations, provider JSON, reference images and prices
in these browser tests are **SYNTHETIC**. They establish UI/state behavior only.
The portrait stream genuinely delivers **720×1280** video; inference receives the
uncropped uniformly resized **576×1024** bitmap. Green-overlay tests sample canvas
pixels at the normalized quad's exact portrait contain positions after resize.

- RED: `MVP_PORT=4255 npm run test:e2e -- --grep 'portrait-video320' --project=desktop`:
  **1 failed**, old document `scrollHeight=1637` versus allowed `741` at 320×740.
  Log: `red-fit.log`. After viewport rows/dock implementation and correcting a
  new-test TypeScript video-element cast, build passed and the same test was
  **1 passed (1.6s)**, `green-fit.log`.
- RED: `--grep 'portrait-video390' --project=desktop`: **1 failed**, expanded detail
  lacked Scryfall/FX provenance. Moving trusted provenance into the internal detail
  area produced `--grep 'portrait-video320|portrait-video390' --project=desktop`:
  **2 passed (2.1s)**, `green-expand.log`.
- The initial 8-case desktop matrix was **5 passed / 3 failed**. Additional strict
  ancestor-clipping checks and screenshot inspection exposed compact USD clipping,
  large-font summary clipping and short-height reference-image space. Fixed these
  by reserving summary room, using a full-width currency row, removing an empty
  image-control row and sizing thumbnails for short viewports. A broad `.small`
  test selector initially included deliberately hidden image-credit nodes; it was
  corrected to target the actual essential English/similarity fields, with those
  fields and all currencies still required to be fully unclipped.
- First full run: **118 passed / 12 failed (1.4m)**, `first-full.log` and
  `first-full/`. Six causes appeared in both projects: rotated summary clipping and
  legacy search/manual/history interactions against now-hidden perpetual sections.
  Exact affected-case rerun after layout and deliberate navigation corrections:
  **12 passed (8.2s)**, `compat-green.log`.
- After CSS consolidation, full run: **128 passed / 2 failed (46.7s)**,
  `final-e2e.log` / `final-full/`. Removing an inherited full-width action rule had
  wrapped desktop confirmation buttons and squeezed the summary. Restored an
  explicit full-width fixed action row.
- Screenshot inspection then found a partly clipped camera Stop in the simulated
  keyboard viewport. Added camera-target clipping/non-overlap assertions. RED
  matrix: **16 passed / 2 failed**, `controls-green.log`, because visualViewport
  height differed from CSS layout viewport height. Corrected height-dependent
  classes and separated enlarged-font overlay targets. `immersive-final.log`:
  **18 passed (8.9s)**. A whole-suite run then passed **130 (47.9s)**,
  `final-verified-e2e.log`.
- Final arrow audit found short compact 80% versus expanded 72% could make Up
  shrink the panel. Corrected short-state allocations to compact≤73%/expanded82%,
  added real resize-direction assertions at shortened/keyboard heights and paired
  320×740/large-text/keyboard screenshots. `arrow-resize-green.log`:
  **18 passed (8.0s)**. This audit assertion was added after the allocation fix;
  no separate pre-implementation RED is claimed for it.

Core viewport and rich-detail behaviors have recorded pre-implementation RED→GREEN.
Later matrix, route, visualViewport and clipping regressions were fixed against
real failures. Supporting screenshot/resize/large-text assertions were extended
iteratively; this report does not claim an individual initial RED for every final
assertion. No skips, retries, test deletion or relaxed safety thresholds were used.

## Intentional superseded test changes

All **112 inherited browser cases** remain; **9 new cases × 2 projects = 18** gives
**130 total**. `immersive-routes.ts` uses visible navigation/close buttons, without
app-state injection or forced clicks, to make formerly perpetual-section actions
explicit. Search/history/manual/debug behavior assertions remain. An initial
always-visible search/file expectation now opens the search route first. Old
camera minimum-300px checks become positive remaining camera space, combined with
stronger full-frame/quad and unclipped-action checks, because a viewport-fitting
camera must flex at short heights. History's former `overflowY: visible` document
assumption becomes `overflowY: auto` on its bounded drawer body. Deliberate result
scrolling becomes opening its route. Existing delayed image/FX/rules tests retain
focus/disclosure/input checks and now preserve actual drawer `scrollTop` as well
as zero document scroll; candidate late FX also preserves internal detail scroll.
These are changes to user-superseded layout expectations, not recognition/provider
safety weakening.

## Final validation and evidence

- Final `npm run check`: typecheck passed; **158 tests / 19 files passed (2.04s)**.
- Final `npm run build`: passed; CSS **15.74 kB / gzip 3.95 kB**, JS
  **50.48 kB / gzip 18.25 kB**. Sizes are not device latency evidence.
- Final `MVP_PORT=4255 npm run test:e2e -- --output=/Users/dikeda/workspace/mtg-card-scanner-research/candidate-immersive/final-candidate`:
  **130 passed (48.6s)**, desktop Chromium and mobile-viewport projects, no retries
  or skipped tests. Log: `final-candidate-e2e.log`; artifacts: `final-candidate/`.
- `git diff --check`: passed. Final own port4255 listener check returned no listener;
  all Playwright-owned preview servers exited. No other server was stopped.

Final check/build logs: `final-check.log`, `final-build.log`. Logs and artifacts are
outside git in:
`/Users/dikeda/workspace/mtg-card-scanner-research/candidate-immersive/`.

Screenshots are project-qualified (`desktop-*`, `mobile-viewport-*`) to prevent
parallel-project overwrites. Final paired compact/expanded images cover 320×740,
320×600, 390×844, 390×540, 440×780 and desktop 1280×900, plus 320×500 with 24px root
text and simulated 390×360 keyboard viewport offset150. The latter uses a labelled
**mock visualViewport event**, not a physical software keyboard; black regions
outside that simulated viewport are not genuine phone browser bars. Full-frame
canvas pixels say SYNTHETIC and reference-image pixels say TEST ONLY.

Inspected actual final PNGs at 320 compact/expanded, 390 compact/expanded, 440
compact/expanded, desktop expanded, large-text expanded and keyboard-offset
compact/expanded. JP/EN, both currencies, similarity, arrows, confirmation/dismiss,
camera action targets and navigation remain within their intended visible region.
Expanded long rules/provenance deliberately continue inside the panel scroller.
No private user screenshots were used, uploaded or committed. Earlier unqualified
PNG files and failed-run evidence are historical; use the project-qualified final
images and `final-candidate/` artifacts for review.

## Changed paths and limits

Incremental owned changes in this follow-up:
`src/main.ts`, `src/ui/style.css`, `tests/browser/candidate-immersive.spec.ts`,
`tests/browser/immersive-routes.ts`, and route/layout assertions in
`camera-first-design.spec.ts`, `combined-camera-ui.spec.ts`,
`continuous-camera.spec.ts`, `format-legality.spec.ts`, `live-candidate.spec.ts`,
`reference-image.spec.ts`, `scan-history.spec.ts`, `smoke.spec.ts`, plus this report.
Existing recognition/domain/unit/shared-contract edits from the prior worker remain
intentional and were not discarded. No package, lockfile, config or dependency
changes in this follow-up.

Real camera/model recognition accuracy, live provider behavior, physical iPhone
Safari/Android, safe-area/browser-bar/software-keyboard behavior on real devices,
startup/scan latency/thermal performance: **NOT RUN**. Desktop Chromium with mobile
viewports and mocked visualViewport events is not phone evidence. Very small
viewports necessarily reduce the contained camera image and visible expanded-detail
area; complete long information stays reachable internally. Parent still needs to
review/pin the combined candidate and arrange independent TEST/QA. No release or
public deployment approval is claimed. Port4195/other worktrees were not modified,
started, stopped or deployed.

## Final overlay-window correction (2026-10-04)

Branch remains `feat/candidate-first`; HEAD remains
`85b05ad48311d65de538f00dd220cd2d45d741be`. No new commit. Preserved the existing
candidate-first and immersive edits, including the inherited shared-contract edit.
Read the external layout addendum through its final appended overlay directions.
This correction replaces the earlier report's nonmodal auxiliary behavior only.

Settings/recognition debug, name search, history and confirmed-card/manual controls
now occupy a labelled native `dialog.showModal()` window above the camera, with a
dim `::backdrop`. The ordinary candidate dock remains nonmodal. Native top-layer
modal behavior and explicit `inert` on the camera/dock prevent background focus,
pointer interaction and clickthrough. Opening/closing the window never changes the
camera/dock allocation. Window title and explicit Close stay outside its internal
scroll body. Escape uses native `cancel`, closes the window and restores the
original trigger; route changes inside the open window retain that trigger.
Tab/Shift+Tab wrap at visible enabled endpoints. `checkVisibility` excludes closed
`details` descendants; client rectangles alone did not do so. Focused fields are
revealed by scrolling only the body, with room for the focus outline when the
visual viewport shrinks. Window bounds follow visual viewport dimensions/offsets
and safe-area values. The document remains unscrolled.

Inspected the preceding desktop camera screenshot and removed the visible brand
masthead across viewport sizes; retained its accessible heading and the existing
small camera-edge controls. No broader redesign. No camera-start/permission,
setting-apply, recognition or pricing behavior was added to opening a window.
History-list opening still retains capture; selecting an entry stops/releases
capture before showing its result. Escape/Close never restart it. Search submission
still stops capture. Manual choices, tab history, candidate-only metadata,
no-auto-confirm and held-key/version protections remain unchanged.

Modal background controls require dismissal before switching auxiliary routes or
starting/stopping the camera. Updated the shared browser route helper and existing
browser interaction steps to use the explicit Close button. Safety/data/history
assertions remain. No forced clicks, skip, retry or threshold relaxation was added.
All 130 preceding E2E cases remain, plus six new cases in each project.

### Actual RED/GREEN

Evidence root remains the external `candidate-immersive/` directory above. All
camera/worker/provider/reference-image data are labelled SYNTHETIC fixtures.

- `MVP_PORT=4259 npm run test:e2e -- --grep 'settings overlay is modal' --project=desktop`:
  RED **1 failed** against the preceding built app: no accessible dialog. Log
  `overlay-red.log`. Native modal wiring then produced **1 passed (1.6s)**,
  `overlay-green.log`, including unchanged background geometry and Escape focus
  restoration at 320px.
- `--grep 'overlay focus endpoints' --project=desktop`: RED **1 failed** because
  reverse Tab escaped native dialog focus into browser chrome, `overlay-focus-red.log`.
  First endpoint fix exposed closed-details nodes incorrectly included by rectangle
  checks; `overlay-focus-green.log` records that intermediate failure. Filtering
  actual visibility produced **10 passed (3.5s)** in both projects for overlay,
  320px/short viewport, lifecycle and focus checks, `overlay-matrix-green.log`.
- `--grep 'focused settings field' --project=desktop`: RED **1 failed** after
  shrinking an already-focused field's visual viewport, `overlay-keyboard-red.log`.
  Body-only focus reveal initially left fractional-pixel/focus-outline clipping;
  rounding upward and reserving 8px fixed it without relaxing the assertion.
  Final targeted overlay matrix **12 passed (4.2s)**, `overlay-final-matrix.log`.
- Final expanded whole-suite initially had **141 passed / 1 failed (50.2s)**:
  a deferred focusin callback adjusted the focused rules disclosure scrollTop from
  34 to 42 after the test took its snapshot. This was a real regression; preserved
  assertions and removed the general deferred focusin correction. Focus reveal now
  occurs only on viewport resize or endpoint wrap. Targeted unchanged late-FX plus
  keyboard/Tab tests: **6 passed (3.3s)**, `overlay-scroll-regression-green.log`.
  Failed full-run log remains `overlay-scroll-regression-red.log`, with its trace
  and screenshot under `overlay-final/`.
- A whole-suite intermediate run passed **140 (49.6s)** before adding the final
  already-focused keyboard-resize case. That log was replaced by the final full
  run below; no claim that the intermediate trace directory is retained.

New overlay assertions cover native modal state, trigger restoration by Escape
and Close, Tab endpoint containment, actual pointer clicks on a background camera
Stop target, explicit inertness and rejected background focus, zero document
scroll, unchanged camera/dock bounds, internal scrolling, 320×740 and simulated
320×320 visual viewport at offset120, focused-field reachability after shrinking,
no unconfirmed history writes and no camera restart after history selection.
Supporting matrix assertions/screenshots were added after initial wiring; only
the three RED behaviors listed above are claimed as initial TDD evidence.

### Final evidence and scope

Final commands/logs:
- `npm run check`: typecheck and **158 tests / 19 files passed** (2.02s),
  `overlay-final-check.log`. A new test initially needed an explicit HTMLElement
  cast for `.inert`; corrected before the passing final check.
- `npm run build`: passed, CSS **16.33 kB / gzip 4.07 kB**, JS
  **51.61 kB / gzip 18.64 kB**, `overlay-final-build.log`.
- `MVP_PORT=4259 npm run test:e2e -- --output=/Users/dikeda/workspace/mtg-card-scanner-research/candidate-immersive/overlay-final-verified`:
  **142 passed (49.0s)**, desktop Chromium and mobile-viewport projects, no retries
  or skips. Log `overlay-final-e2e.log`; final artifacts `overlay-final-verified/`.
- `git diff --check`: passed. Playwright's own port4259 preview server exited;
  `lsof -nP -iTCP:4259 -sTCP:LISTEN` returned no listener. No other server was stopped.

Saved and inspected `desktop-settings-overlay-desktop.png`,
`desktop-settings-overlay320.png`, `mobile-viewport-settings-overlay320.png`,
`desktop-settings-overlay320-short.png` and
`desktop-settings-overlay-keyboard-focused.png`. Both project-qualified versions
are saved. The desktop window visibly dims the unchanged camera/candidate; 320px
content wraps within the window; its Close remains visible while its body scrolls.
The short mock-viewport image shows the focused expiry field and its focus outline
inside the body. These are synthetic browser observations, not physical keyboard
or phone evidence. No user image was uploaded or committed.

Incremental production paths: `src/main.ts`, `src/ui/style.css`.
Incremental test/report paths: `tests/browser/candidate-immersive.spec.ts`,
`tests/browser/immersive-routes.ts`, interaction steps in the eight preceding browser
specs (`camera-first-design`, `combined-camera-ui`, `continuous-camera`,
`format-legality`, `live-candidate`, `reference-image`, `scan-history`, `smoke`),
and this report. No new dependencies or config/shared-contract edits in this
correction. Existing dirty changes were preserved. No commit, push, deploy, other
worktree or live4195 changes. No implementation blocker remains; independent
combined-candidate TEST/QA and physical Safari/Android, keyboard/safe-area/browser
bars, real recognition/provider accuracy and performance remain **NOT RUN**.
