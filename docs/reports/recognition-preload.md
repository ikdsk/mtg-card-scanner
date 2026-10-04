# Initial-load recognition preparation

Branch: `fix/recognition-preload`. Base: `5ed9293c1b5eea123136617995f67336b91f67c6`.
No commit, push or deploy performed. Changes are uncommitted for parent integration.

Owned changes:
- `src/main.ts`: start preparation after shell/lifecycle setup at navigation; share one pending preparation Promise and retain ready state; explicitly invalidate preparation on retry, file replacement and pagehide. Scan/evidence generations still gate inference and results. Camera permission is still requested only by the explicit camera button. Retry remains in the camera action area instead of being moved into the closed search drawer.
- `tests/browser/recognition-preload.spec.ts`: synthetic Worker/canvas lifecycle tests covering initial preparation without camera permission, shared pending camera preparation, failed preload/reachable retry, pagehide/late completion/stop/restart, and local image replacing pending preload. No fabricated real recognition claims.
- `tests/browser/candidate-immersive.spec.ts`: layout selector now checks `.action-panel button:not([hidden])`. The newly placed conditional retry is intentionally hidden unless preparation fails. Existing visible action clipping, overlap, full-frame/overlay, focus, manual and confirmation assertions are unchanged. The new failure test requires retry to be visible and successfully clicks it in both projects.
- This report.

## TDD evidence

`npm ci` exit 0:
```
added 87 packages, and audited 88 packages in 645ms
found 0 vulnerabilities
```

Behavior 1 RED, before production edits:
`npm run build` exit 0, then
`MVP_PORT=4271 npm run test:e2e -- tests/browser/recognition-preload.spec.ts` exit 1:
```
Expected: 1
Received: 0
Timeout 5000ms exceeded while waiting on the predicate
2 failed
```
Both desktop and mobile-viewport navigation tests failed because no init was posted.
After adding initial `prepare()` and honest loading text, same command exit 0:
```
2 passed (1.3s)
```

Behavior 2 RED, with preload present but no preparation coalescing:
`MVP_PORT=4271 npm run test:e2e -- tests/browser/recognition-preload.spec.ts --grep 'camera joins'` exit 1:
```
Expected length: 1
Received length: 2
2 failed
```
The preparation ring buffer showed two `model-start` events. After sharing the pending Promise and centralizing invalidation, the targeted suite exit 0:
```
4 passed (1.6s)
```
The test also releases the pending Worker and requires frames to start, exactly one Worker init and zero unconfirmed history rows.

Behavior 3 RED, failure surfaced but retry still inside closed search drawer:
`MVP_PORT=4271 npm run test:e2e -- tests/browser/recognition-preload.spec.ts` exit 1:
```
Locator: getByRole('button', { name: '認識の準備を再試行', exact: true })
Expected: visible
Error: element(s) not found
2 failed
6 passed (8.0s)
```
After keeping retry in camera actions, same command exit 0:
```
8 passed (2.4s)
```

Test-authoring interruptions: a debug drawer helper accidentally collapsed already-open information; that run was terminated and the helper corrected before the valid coalescing RED above. A trial placement inside camera-info was pointer-inert due to existing CSS; that run was terminated and retry moved to existing actionable camera controls. Two premature overlapping suite invocations exited with `http://127.0.0.1:4271 is already used`; subsequent runs were serialized. Only this worktree's own processes were terminated.

First full browser run, exit 1:
```
18 failed
132 passed (55.0s)
```
All failures were existing immersive layout checks counting the intentionally hidden new retry as a clipped essential action. The selector update described above retains all visible-action safety checks. No tests skipped or thresholds relaxed.

## Final verification

All commands used this worktree; browser server port 4271.

`npm run check` exit 0:
```
 Test Files  19 passed (19)
      Tests  158 passed (158)
   Duration  2.35s (tests 59%, transform 29%, import 8%, worker 4%)
```

`npm run build` exit 0:
```
vite v8.3.2 building client environment for production...
✓ 24 modules transformed.
dist/index.html                  0.44 kB │ gzip:  0.30 kB
dist/assets/index-CcOyWei8.css  16.33 kB │ gzip:  4.07 kB
dist/assets/index-BXP8g1zZ.js   51.74 kB │ gzip: 18.69 kB
✓ built in 49ms
```

`MVP_PORT=4271 npm run test:e2e` exit 0, both configured desktop and mobile-viewport Chromium projects, all files and no skips:
```
152 passed (50.8s)
```
This includes the 10 new lifecycle cases (five behaviors × two projects), existing file/frame cancellation, camera permissions, continuous/manual overrides, no auto-confirm, overlay geometry, focus and layout regressions. Final raw browser output: `/tmp/recognition-preload-browser-final.log`; check output: `/tmp/recognition-preload-check.log` (local ephemeral logs, not committed).

`git diff --check` exit 0. No adapter, dependency, config, lockfile or contract changes. No parent real-network evidence was supplied during this task; release investigation is still separate.

## Limits and cause

Observed local behavior cause: main.ts only called preparation from camera/file/retry, so navigation did not initialize the recognition Worker. Repeated preparation callers also independently advanced preparationGeneration although the adapter shared its init Promise. The patch coalesces at the UI preparation boundary as well.

The deployed `認識データを準備できません` failure cause remains UNKNOWN here. Synthetic catalog failure tests prove presentation/retry behavior only. Parent is independently investigating real Worker/network evidence; no vendor/asset/network workaround is bundled. Real model accuracy, live provider behavior, physical camera/mobile latency and human iPhone/Android tests remain NOT RUN. Chromium mobile viewport is not real-device evidence. Combined candidate verification and release remain parent-owned.

## Explicit same-worktree follow-up

Preload changes and tests were preserved. Internal-ID result gating and DFC
Japanese-name/recognized-face fixes, exact RED/GREEN evidence and latest combined
local verification are documented in [dfc-metadata.md](dfc-metadata.md).
The original preload evidence above is historical; parent has since supplied
independent successful real-worker init on deployed HTTPS in Chromium and desktop
WebKit, with the user init error still not reproduced. No iPhone evidence exists.
