# QA-LIVE-001 narrow fix

2026-10-04. Branch `feat/live-candidate-confirmation`; HEAD/base remains
`db9264326997fc1c43050dcba656a1e9adce8248`. No commit, push or deployment.
Owned changes only: `src/main.ts`, `tests/browser/live-candidate.spec.ts`, this report.
The pre-existing index was captured before work and compared byte-for-byte after
implementation (`cmp /tmp/live-fix-staged-{before,after}.patch`, exit 0).
No QA worktree, other worktree or port 4195 writes/actions.

Activation now clones/freezes the initial proposal identity/version per gesture.
Enter activates once on initial keydown; Space activates once on matching keyup.
Both prevent default browser repeat activation and ignore repeat keydown. The
keyboard snapshot survives initial Enter activation until release, so an unavailable
A cannot fall back to B. Blur/window blur/pointercancel invalidate the snapshot;
release after focus moves cannot activate it. Pointer and assistive click paths
retain existing identity validation. A fresh gesture can accept verified B.

## Exact commands and evidence

Logs and independent probe copy/config/results are in
`/tmp/live-candidate-fix-evidence/`. Fixtures are SYNTHETIC camera canvas, worker
results and provider metadata; key events use Playwright's native keyboard API.
Existing assertions were retained. No extra waits, retries, skips or thresholds.

- RED build: `npm run build` passed, before product edits.
- RED `MVP_PORT=4247 npm run test:e2e -- --grep 'held Space' --project=desktop`:
  1 failed (6.2s), expected zero history rows, actual one for B.
- RED same command with `held Enter`: 1 failed (6.1s), same wrong B history row.
  Enter fixture makes A metadata unavailable, since native Enter activates on
  keydown. Both tests assert native repeat flags `[false,true]`.
- First GREEN `MVP_PORT=4247 npm run test:e2e -- --grep 'held (Space|Enter)' --repeat-each=3`:
  12 passed (5.4s), desktop + mobile viewport.
- Final GREEN `MVP_PORT=4247 npm run test:e2e -- --grep 'held (Space|Enter)|canceled Space' --repeat-each=3`:
  30 passed (7.1s). Includes element blur, window blur and pointercancel, and
  fresh-gesture acceptance after cancellation. Cancellation tests were added
  after the core RED/GREEN fix; no separate cancellation RED claim.
- Unmodified independent `independent.spec.ts` copied from QA into /tmp, never
  edited there or in QA. `npx playwright test -c /tmp/live-candidate-fix-evidence/playwright.config.ts --grep 'held Space' --repeat-each=3 --output=/tmp/live-candidate-fix-evidence/independent-results`:
  3 passed (2.1s), own preview on 4247. Original probe's 200ms wait is retained
  unchanged; maintained regression adds no arbitrary waits.
- `npm run check`: typecheck and 158 tests / 19 files passed (2.22s).
- `npm run build`: passed; JS 47.67 kB / gzip 17.59 kB; CSS 8.98 kB / gzip 2.67 kB.
- First `MVP_PORT=4247 npm run test:e2e`: **103 passed / 1 failed (42.4s)**.
  Failure is the previously reported desktop smoke.spec.ts:75 timeout at 30.1s.
- `MVP_PORT=4247 npm run test:e2e -- --grep 'manual correction search discards' --project=desktop --repeat-each=5`:
  5 passed (2.8s), unchanged test.

## Smoke timeout investigation

The reported timeout reproduced in the full suite. Independent original QA trace
shows `/cards/en1` emitted then aborted (`net::ERR_ABORTED`); search click completed,
search route fulfilled, and no further test assertion began. The test waits at
`release(); await delivery` (line 103), where `delivery` resolves only inside the
card route callback after fulfill. Evidence is consistent with search cancellation
racing route callback dispatch: request observation alone does not establish that
the delayed route handler entered. This is a harness-race inference, not proof
that all product cancellation behavior is correct. No unrelated product/test fix
or wait was added. The first local failure log is preserved; default output was
subsequently replaced by the isolated run. A full unchanged rerun uses a dedicated
output path to preserve any second failure trace. Full suite stability is not claimed.

## Limits

Real iPhone/Android, camera recognition accuracy, live provider behavior and
sustained/thermal/mobile performance remain NOT RUN. Independent re-review of the
final candidate remains coordinator work. No image upload, purchases, dependency
or contract changes. Final rerun/server verification is recorded below.

- Unchanged full rerun: `MVP_PORT=4247 npm run test:e2e -- --output=/tmp/live-candidate-fix-evidence/full-rerun-results`:
  **104 passed (39.2s)**. This does not erase the reproduced smoke timeout above.
- Final `git diff --check`: passed. Final index patch again compared byte-for-byte
  to the initial staged patch, exit 0. Fix/report remain unstaged.
- All own Playwright preview processes exited. Final
  `lsof -nP -iTCP:4247 -sTCP:LISTEN`: exit 1, no listener. No other server stopped.
