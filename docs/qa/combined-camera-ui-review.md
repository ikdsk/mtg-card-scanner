# Independent combined Issue 18 UI review

## Decision: PASS (fixed candidate scope only)

No blocking security concerns or logic errors found. This is independent QA of B camera-first layout + JPY primary + format badges + session scan history, **not** an all-MVP, real-device/performance or deployment approval.

- Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-combined-camera-ui`.
- Detached HEAD/base: `eb321dcbdf7a26f2302de1e2e1355dae93953584`.
- Fixed patch: `/Users/dikeda/workspace/mtg-card-scanner-research/combined-camera-ui-review.patch`.
- SHA-256 before/after: `8d44e1e15108289845175b9aeccb336566673a82fbc6f9420d70ced6c5446cb3`.
- All **19** changed/untracked candidate files were inspected and their SHA-256 identities remained unchanged. `git apply --reverse --check` against the fixed patch passed. No staging, commits, pushes, product edits or deployment.

## Requirements and review

Read [Issue 18](https://github.com/ikdsk/mtg-card-scanner/issues/18) and **all six comments**, including the additional user requirements for format icons, JPY prominence and session history. `gh issue view --comments` hit the deprecated Projects GraphQL field; recovered via `gh api .../issues/18` and `.../issues/18/comments`. Original requirement/comment JSON is preserved in the evidence directory. Prior implementer reports were treated as provenance, not as proof that tests passed here.

Reviewed every changed path, including four historical reports, seven production files and eight test files. Security scan covered tracked added lines and all untracked additions. No secret assignment, shell injection, dangerous eval/deserialization, unsafe HTML insertion, or new product persistence/network call found. A storage-keyword hit was harmless explanatory report prose. New metadata is rendered through text nodes; history thumbnails reuse the existing HTTPS/host/credentials/port URL checks.

### Verified behavior

- **B shell:** promotional copy removed; neutral dark camera area and white result sheet. Search, local input, attribution, privacy and diagnostic disclosures remain available. Explicit camera start, stop after accepted recognition, truthful idle/error/loading states, existing full-frame capture and `object-fit: contain` retained. Portrait/landscape geometry tests passed.
- **Prices:** approximate JPY primary, smaller explicit USD secondary; overseas-reference and non-domestic-price labels retained. Null is not zero; zero remains displayed; missing FX does not fabricate JPY. Source/date/cache disclosures and selected printing/language/finish target remain available.
- **Formats:** seven explicitly labeled major paper formats beneath current card identity. Uses selected card legalities, not Japanese text fallback; legal, banned, unavailable, restricted and unknown differentiated through status/text/marks. Tap, Enter, Space and accessible labels tested. Stale card status/disclosure reset and asynchronous focus retention tested.
- **History:** after result/actions in normal document flow; newest first, capped at 100, memory-only/reload clears. One entry per accepted scan generation, deliberate rescans separate; price/FX renders, search and reopen do not add entries. Overrides update the corresponding original event, including an older reopened row. Reopening restores exact printing/language/finish, reference image, formats and price and does not restart the camera. No captured pixels, input filename or embeddings retained by history.
- **Async/DFC:** generation/abort and session-token guards preserved; pending metadata cannot replace a historical reopen. Late FX, printing and image work retain expected result state, control/summary focus, scroll and DFC back-face selection. New identity resets reference face state.
- **Regression preservation:** no changes to recognition core, domain, repository/data, result session, full-frame capture module, dependencies or browser config. Programmatic comparison retained all 81 statically parsed baseline literal test names (not a runtime test count). Reviewed monetary selector adaptations preserve exact amounts and original override steps; disclosure opening precedes existing Japanese/Oracle text assertions. No skipped/deleted tests or weakened assertions found. New B, format, history and combined suites all ran together.

## Independent actual execution

In the QA worktree:

| Command | Actual result |
|---|---|
| `npm ci` | PASS; 87 packages added, 0 audit vulnerabilities |
| `npm run check` | PASS; TypeScript, 143 unit/regression tests, 14 files |
| `npm run build` | PASS; 21 modules; JS 35.12 kB / gzip 13.65 kB; CSS 7.95 kB / gzip 2.46 kB |
| `MVP_PORT=4231 npm run test:e2e` | PASS; 64/64, 27.9s, Chromium desktop and mobile viewport |
| `git diff --check` | PASS |
| Reverse fixed-patch check | PASS |
| Before/after candidate identities | PASS; all 19 files, HEAD and fixed patch unchanged |

Build sizes are not device performance measurements. All outcomes above are my executions, not the parent's previously reported results.

### Additional independent synthetic probe

Executed `node research/qa-combined-camera-ui/probe.mjs` with own production preview on port 4231, after HTTP readiness verification. PASS:

1. Failed accepted-ID metadata request creates no history row.
2. Hostile `<img ... onerror>` and `<script>` metadata remains literal text. Off-host and `javascript:` image URLs produce no image request or execution, in both result/history paths.
3. Missing FX retains `$0.00 USD` without a numeric JPY value.
4. After two accepted scans, reopen the older foil selection while a third card metadata request is pending; deliver the stale response. Result retains original formats, target, USD and two rows. Subsequent finish override modifies only that older event.
5. Zero camera calls, zero unexpected external requests, zero page errors; no horizontal overflow at 320px; reload removes history.

Probe fixtures are entirely synthetic; actual provider URLs were intercepted, model/worker behavior simulated. No private images, model downloads or live recognition used. The probe and its result were archived from the QA worktree into the evidence directory after execution. To replay it unchanged, copy `probe.mjs` into the QA worktree's `research/qa-combined-camera-ui/`, then use the command above with a preview on 4231. Its relative outputs intentionally match that original run location.

## Rendered visual evidence inspected

Opened through the image tool, from the independent rerun's browser-generated screenshots:

- `combined-camera-ui/combined-mobile-viewport-390-initial.png`
- `combined-camera-ui/combined-mobile-viewport-390-history.png`
- `combined-camera-ui/combined-mobile-viewport-320-result.png`
- `combined-camera-ui/combined-desktop-1280-result.png`
- `qa-combined-camera-ui/probe-mobile.png`

Paths are relative to `/Users/dikeda/workspace/mtg-card-scanner-research/`.

Observed no overlap or horizontal clipping; dark camera-first shell, white result, clear JPY-over-USD hierarchy, wrapped distinct badges, primary next-scan action and normally scrolling history. The native file chooser's filename text abbreviates at narrow width, but label and chooser remain reachable. At 320px lower manual controls require normal scrolling; the next-scan button remains visible in the tested result viewport. Long hostile metadata in the independent probe wraps as literal text without markup execution or overflow.

## Non-blocking suggestion

New browser specs hardcode absolute screenshot paths (for example `tests/browser/combined-camera-ui.spec.ts:36`). A future test-only cleanup could accept an artifact-root environment variable to avoid workstation-specific paths/shared screenshot destinations. No product change or extra acceptance gate is requested here.

## Evidence, cleanup and limitations

Evidence directory: `/Users/dikeda/workspace/mtg-card-scanner-research/qa-combined-camera-ui/`:

- `identities-before.json`, `identities-after.json`: complete candidate path/hash manifests; after asserts unchanged.
- `security-scan.json`, `preservation.json`.
- `issue.json`, `comments.json`.
- `probe.mjs`, `probe-result.json`, `probe-mobile.png`.

Playwright cleaned up its preview; subsequently stopped only my own port-4231 probe preview via its tracked process handle. Verified no listener remained on 4231. No live-4195 process or Tailscale configuration touched. Product worktree retains exactly its original candidate changes; report/probe artifacts are outside it.

**NOT RUN:** actual iPhone Safari/Android hardware, real camera recognition, live provider validation by this reviewer, startup/scan latency, real-device memory/thermal/background behavior. Existing synthetic Chromium tests do not establish these. No public deploy/release or all-MVP completion claim.
