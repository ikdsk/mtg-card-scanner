# Issue14 camera geometry — independent QA

## Verdict: PASS (narrow correction only)

No blocking security concerns or logic errors found. No product edits, staging, commits, pushes, uploads or deployment performed. The candidate remains unstaged on base `aafdda32e1f37ee8eb60b77d49529a08a6ba8b50` in the dedicated `qa-camera-geometry` worktree.

Patch SHA-256: `835c6449e95a8167f3531e75827946344693d2f9acc9a01a34b5461545beb21d`.

Read all seven changed/new files, including the untracked helper, unit tests, browser tests and implementation report; also reviewed camera lifecycle and recognizer interaction. `git apply --reverse --check` succeeds. Patch hash and all seven candidate-file hashes remained unchanged across QA; `git diff --check` passed.

## Independent execution

Node `v24.2.0`, workdir `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-camera-geometry`:

| Command | Actual result |
|---|---|
| `npm ci` | exit 0; 87 packages installed; 0 reported vulnerabilities |
| `npm run check` | exit 0; TypeScript + 135 unit/regression tests in 11 files passed |
| `npm run build` | exit 0; production CSS 4.45 kB / JS 27.41 kB |
| `MVP_PORT=4205 npm run test:e2e` | exit 0; all 22 tests passed, 9.1 seconds |
| `node /Users/dikeda/workspace/mtg-card-scanner-research/qa-camera-geometry/probe.mjs` | exit 0; six independent synthetic checks passed |
| `git diff --check` | exit 0 |
| `git apply --reverse --check /Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry-review.patch` | exit 0; check only, no patch application |

No baseline stash/reset or product mutation was needed. These are independent green reruns, not a claim to have reproduced the implementer's RED phase. E2E includes desktop and mobile-sized Chromium, not physical mobile devices.

## Focused findings

- **Full delivered frame:** `src/ui/camera-geometry.ts:2-7` uses the two-argument `createImageBitmap(video, options)` overload; no source rectangle, inset, fixed 720×1003 output or padding. Both axes share `min(1, 1024/max(width,height))`, with integer rounding. Unit tests cover landscape, portrait, 4:3 and smaller inputs. Real Chromium synthetic Y4M tests preserve all four quadrant samples at inference edges and produce the expected bounded aspect ratio.
- **Preview:** `src/main.ts:23-25` derives aspect from nonzero delivered dimensions on resize; stylesheet uses contain and removes the inset-crop guide. The independent canvas-stream probe changes the running source from 1280×720 to 720×1280. Inference changes from 1024×576 to 576×1024; preview becomes `720 / 1280` and remains `contain`.
- **Zero dimensions:** the helper assumes a usable video frame. The existing caller at `src/main.ts:118` postpones capture while width is zero. The independent probe forced zero width at startup, observed no inference for 400 ms, then restored width and observed normal capture. A normal unavailable video has zero dimensions; no new blocking zero-dimension regression was found. This does not claim exhaustive coverage of every browser's unusual transient state or direct invalid helper calls.
- **Stop/restart/stale frames:** `src/main.ts:121-124` closes a bitmap completed after scan-generation change rather than forwarding it. Independently delayed bitmap completion across stop: no added worker input; exactly one bitmap close; tracks ended. Restart resumed inference and restored landscape aspect. Synthetic pagehide ended all tracks. Existing Y4M tests independently passed explicit stop/restart and synthetic visibilitychange track release. This prevents stale-frame recognition across a stopped scan.
- **Constraint semantics:** intercepted request contains `resizeMode: { ideal: 'none' }`, not exact/mandatory. Existing ideal environment/1280×720 and audio:false remain. This is a browser preference, not a sensor-mode guarantee.
- **Scope/invariants:** no gate, recognition worker, model/catalog, dependency, manual-selection or price-path modifications. No new cropped hidden input region is introduced. Candidate acceptance still uses the existing gate.
- **Security/privacy:** static added-line scan found no secret, eval/exec, shell-injection, pickle or innerHTML assignment hits; manual review found no added network/upload/exfiltration path. QA probe blocks non-loopback requests and uses only generated canvas pixels. No private real photograph or derivative was opened/uploaded by this QA.

## Non-blocking notes

1. `docs/reports/camera-geometry.md:27,37-38` retains the implementer's historical claim that contracts need a coordinator update. **Already resolved:** current `docs/contracts.md:88-92` accurately describes complete delivered-frame input and ideal resizeMode. This is report cleanup, not a contract defect or acceptance blocker.
2. The independent resize/delayed-bitmap probe may be promoted to maintained tests later; not required for this minimal fix. Current geometry E2E covers static portrait/landscape and lifecycle; the additional probe exercises a running source's dimension transition.

## Evidence boundaries / unresolved gates

- Synthetic tests prove pixel geometry, event handling and lifecycle, not recognition accuracy.
- Read the implementation report's private-model evidence; did not rerun photo/model probes or download large assets. Parent-reported exact PNG comparison **4/6 → 6/6** and Y4M fake-camera comparison **6/6 → 6/6** remain distinct. Neither supports claiming physical-device improvement.
- Physical iPhone Safari/Android camera, real background transitions, live motion/lighting and sustained startup/scan performance: **NOT RUN**.
- Complete delivered frame is not necessarily the complete physical sensor. Other browsers may ignore the ideal constraint.
- Issue11 edge-to-edge file-image/detector limitations and physical-device/release gates remain open/out of scope. This PASS is not public-release authorization or full Issue11 completion.

## QA artifacts

- `/Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry-review.json`
- `/Users/dikeda/workspace/mtg-card-scanner-research/camera-geometry-review.md`
- `/Users/dikeda/workspace/mtg-card-scanner-research/qa-camera-geometry/probe.mjs`

Only QA output/probe files were authored. npm/build/test generated ignored dependencies/build/test artifacts in the isolated worktree. Only task-owned port 4205 was used for serving; no active demo/research port was touched.
