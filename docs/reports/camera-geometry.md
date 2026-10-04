# Camera input geometry correction — implementation evidence

Date: 2026-10-04. Branch: `fix/camera-input-geometry`. Base/HEAD:
`aafdda32e1f37ee8eb60b77d49529a08a6ba8b50`.
No new commit, staging, push, merge, upload or deployment. Independent approval
is pending; this is an unstaged implementation candidate, not release approval.

## Change and ownership

- `src/main.ts`: delegates camera bitmap creation to the small geometry helper;
  video `resize` updates preview aspect from the actual delivered frame. Optional
  `resizeMode: { ideal: 'none' }` asks the browser to avoid upstream crop/scale.
  Existing environment-facing camera and ideal 1280×720 request remain. Japanese
  instructions now refer to keeping all four corners in the screen, not an inner
  recognition rectangle.
- `src/ui/camera-geometry.ts`: takes the complete video frame with no source crop,
  scales both axes uniformly to maximum dimension 1024, rounds to integer pixels,
  and never enlarges smaller frames. No inference padding or 720×1003 deformation.
- `src/ui/style.css`: uses `contain`, actual video aspect, and full-frame guide
  semantics; removes the inset card outline, shading, fixed 3:4 and minimum/maximum
  heights that imposed the former geometry. Initial stopped placeholder is 16:9.
- `tests/unit/camera-geometry.test.ts`: deterministic bitmap API geometry checks.
- `tests/browser/camera-geometry.spec.ts`: implementation-owned synthetic camera
  E2E; does not edit independent agents' existing regression/browser tests.
- `docs/reports/camera-geometry.md`: this report.

No package/config/lockfile/shared-contract/model/catalog/worker/gate edits.
Camera-first initialization, one-inflight scheduling, background/pagehide stop,
manual overrides and existing result scroll/focus fixes remain in the existing
paths. Their existing browser regressions still pass.

The resize constraint is optional for browser compatibility, not a guarantee
about all devices' sensor modes. The local intersection type accounts for this
property being absent from our TypeScript DOM types; no shared declaration was
changed. The standard defines `none` as avoiding UA cropping/downscaling:
[W3C Media Capture and Streams](https://w3c.github.io/mediacapture-main/#dom-mediatrackconstraintset-resizemode).
At implementation handoff, the coordinator-owned contract still described the
former 720×1003 crop. The coordinator subsequently updated docs/contracts.md to
full delivered-frame capture before independent review; that review passed.

## RED → GREEN and commands

Commands ran in this worktree with Node v24.2.0. No tests were weakened, skipped
or threshold-relaxed.

1. `npm ci`: exit 0; 87 packages installed, zero reported vulnerabilities.
2. `npx vitest run tests/unit/camera-geometry.test.ts`: initial exit 1 because the
   new helper was absent (suite-load failure, not an assertion RED). To establish
   a behavior RED, copied the existing capture algorithm unchanged into the new
   helper and reran the same command: exit 1, **1 test failed**. Expected the
   complete 1920×1080 source with `{resizeWidth:1024, resizeHeight:576}`; actual
   was source crop `(596,32,729,1015)` and output 720×1003.
3. Replaced only the helper's capture geometry and reran: exit 0, **1 passed**.
   Added portrait, small/no-upscale and 4:3 boundary cases for the same full-frame
   behavior: exit 0, **5 passed**. These assert the full-source API overload (no
   crop arguments), aspect rounding tolerance, resolution bound and no upscale;
   mocked bitmap API alone does not prove browser pixels or recognition.
4. Against the still-built original app, ran
   `MVP_PORT=4201 PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser/camera-geometry.spec.ts --project=desktop`:
   exit 1, **2 failed** (landscape/portrait), expected `contain`, actual `cover`.
   At this point the source edits existed but the served base build was unchanged;
   this is a browser RED against the original behavior, following the earlier
   geometry assertion RED before the production correction.
5. First corrected-build complete E2E run: **20 passed, 2 failed**. The portrait
   fake source was adapted by Chrome to a smaller cropped input under the old
   resolution request. Expected max edge 1024, actual 720. Kept the assertions
   and added the optional native resize-mode preference to production. The first
   build exposed missing DOM typing for `resizeMode`; added the local intersection
   type, then build passed. No global declarations or dependencies were needed.
6. `npm run build`: exit 0. Final production output: CSS 4.45 kB (gzip 1.73 kB),
   JS 27.41 kB (gzip 10.98 kB); model assets remain separate. This is bundle size,
   not a smartphone latency measurement.
7. Corrected the new test to use each project's actual viewport rather than
   hardcoding a mobile viewport for both projects; geometry-only rerun:
   **4 passed** across desktop 1280×900 and mobile viewport 390×844.
8. Final `npm run check`: exit 0, typecheck and **135 tests / 11 files passed**.
9. Final `MVP_PORT=4201 PLAYWRIGHT_NO_SERVER=1 npm run test:e2e`: exit 0,
   **22 passed (8.4 seconds)**. A separately started local preview server was
   necessary for the new browser contexts; `PLAYWRIGHT_NO_SERVER` disables a
   second server start. Existing smoke-test provider responses are SYNTHETIC.
10. `git diff --check`: exit 0.

New E2E writes synthetic I420 Y4M to a temporary directory, launches real Chromium
`getUserMedia`, and uses a clearly labeled SYNTHETIC rejecting worker. It checks
four distinct grayscale quadrants at the inference edges, full-frame aspect,
1024 bound, preview aspect/contain, explicit stop, restart, and track release via
the actual visibility handler with a **synthetically dispatched background state**.
These tests establish geometry/lifecycle, not real recognition. Temp videos and
browsers are removed/closed in `finally`.

## Private real inference evidence

Read the parent `camera-path-probe.mjs`, applet-comparison source probe and verifier,
comparison report/JSON, and the private scene manifest/baseline. The correction
follows their narrow evidence; it does not adopt the applet's permissive gate.

All private inputs, derived Y4M and inference artifacts are **outside Git** under
`/Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/`:

- `canvas-probe.mjs`, `canvas-results.json`: exact PNG comparison.
- `probe.mjs`, `before.json`, `after.json`: actual fake-camera comparison.
- `before-edges.json`, `after-edges.json`: synthetic colored-edge real-worker probe.
- `verify.py`: independent-of-browser artifact assertions (written by implementer,
  not an independent TEST/QA agent).

Commands:

```sh
node /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/canvas-probe.mjs
node /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/probe.mjs before
node /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/probe.mjs after
node /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/probe.mjs before --edges
node /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/probe.mjs after --edges
python3 /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry/verify.py
```

`before` must serve the base build; `after` must serve the corrected build. Both
use port 4201. The exact-PNG comparison executes both algorithms in the same
browser against the same current unchanged worker/model. A canvas with dimensions
aliased to video dimensions exercises the exported production helper; that is
**canvas simulation**, not a camera stream.

The exact-PNG command and final verifier exited 0. Six scene ROIs, two repetitions
per capture variant, real worker/model and unchanged gate (.75 score, .025 distinct
oracle margin, two identical printing IDs) produced:

| Scene | Old crop score | Full-frame score | Old accepted | New accepted |
|---|---:|---:|---|---|
| Time Spiral | .746688 | .788415 | no | yes |
| Lion's Eye Diamond | .876254 | .874597 | yes | yes |
| Sylvan Library | .785273 | .816037 | yes | yes |
| Wrenn and Six | .671047 | .944162 | no | yes |
| Replenish | .935196 | .945096 | yes | yes |
| Mind Over Matter | .887987 | .907576 | yes | yes |

**4/6 → 6/6** existing-gate accepts. Every after frame exactly reproduces the
parent full-scene baseline's printing ID, Oracle ID, score, margin and corners.
Expected names/IDs are evaluator-only and never recognition inputs. This does not
verify the physical printing/language/finish; manual confirmation remains required.

The whole private multiple-card photo remains rejected after bounded full-frame
capture (no card/corners); old camera crop also fails the gate (score .676742).
Synthetic blank and seeded grayscale noise reject in both variants. Five negative
comparisons total: one whole-photo pair plus four synthetic variant rows.

For actual `getUserMedia`, ffmpeg produced I420 Y4M from the SAME six ROI PNGs;
odd dimensions were resized up by at most one pixel to even dimensions (330×405
→330×406, 335×443→336×444). YUV420 conversion also changes colors. Camera tracks
reported `resizeMode:none`; source dimensions are recorded in JSON.
**Before and after both correctly accept 6/6**, with baseline printing IDs and
Oracle IDs and unchanged thresholds. The Y4M result cannot be described as the
PNG 4/6→6/6 improvement. The after command exited 0; all six candidate fixation
paths ended the camera tracks, and blank video was rejected with explicit stop.
The synthetic colored-edge actual-worker case rejects in both variants, retains
all four edge colors after correction (old crop loses them), and confirms stop,
restart and simulated background track release.

The original `before` probe command exited 1 because it accidentally included
`whole-photo-multiple-cards` from baseline without creating a corresponding Y4M;
that row timed out before any usable video. The six intended positive rows and
blank row completed and are verified from artifacts. The corrected probe excludes
that missing fixture; whole-photo negative evidence is the separate exact-PNG
comparison, not a claimed successful fake-camera test. Initial probe attempts also
lacked models in `dist` because assets had been copied after build; those runs were
terminated, local assets were copied into the served build, and evidence runs were
restarted. Failed setup runs are not counted as recognition results.

Assets/vendor were copied from `mvp-fix2/public/recognition` into the ignored local
asset directories without altering originals. Actual SHA-256:

- detector.onnx: `650da3cc3e9ac778c6951de631f824ec1e63bdabf3aaa39a35d7435af625612e`
- milo.onnx: `bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df`

Browsers with private input blocked every non-loopback request via context routing,
with service workers disabled. Exact-PNG comparisons made only loopback requests
and zero blocked external attempts. Full app fake-camera positives attempted local
candidate metadata follow-up to Scryfall; these GET requests were **aborted before
transmission**, recorded as one blocked attempt per scene. No private-image metadata
lookup or external model download took place. Result UI provider behavior is tested
separately by labeled synthetic fixtures; private real inference proof does not
claim a completed live-price UI flow.

## Limits and remaining gates

- Independent TEST/QA approval: **PENDING**. No commit/push until that approval.
- Physical iPhone Safari / Android camera and real background transitions:
  **NOT RUN**. Desktop Chromium mobile viewport is not a physical smartphone.
- Repeated static PNG/Y4M frames are deterministic repeats, not live temporal
  stability, motion, lighting, thermal or sustained latency evidence.
- Six manually selected real scene ROIs support only this camera-input correction,
  not all cards, conditions or whole-image recognition reliability.
- Edge-to-edge file-image model/detector issues remain separate; this does not
  resolve all Issue 11 or authorize a public demo/release.
- Optional `resizeMode` may be ignored by other browsers; preview and detector
  still use the same delivered frame, whose aspect changes are handled by `resize`.
- Real-device startup/scan performance and independently validated combined pinned
  candidate remain required before the user's full completion goal is achieved.

Only this task's port-4201 preview process and task browsers were used; processes
were stopped after verification. Active demo/research ports 4195/4189 were untouched.
