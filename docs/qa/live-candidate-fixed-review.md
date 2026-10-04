# Bounded independent review — QA-LIVE-001

**Verdict: PASS.** No security concerns or logic errors found in the scoped delta. The original wrong-card held-Space reproduction is fixed; no input regression was found in the exercised checks. No product edits, commit or push.

## Identity and scope
- Base: `db9264326997fc1c43050dcba656a1e9adce8248`.
- Patch: `/Users/dikeda/workspace/mtg-card-scanner-research/live-candidate-fixed-review.patch`.
- SHA256: `4a300f894307db88e7a4a6e506e0880b750cb897b234c93afbe058a6861b54e3`.
- Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-live-candidate-fixed`.
- Compared with previous QA candidate: only `src/main.ts`, `tests/browser/live-candidate.spec.ts`, and `docs/reports/live-candidate-fix.md` differ. Review concentrated on gesture handling rather than re-reviewing previously accepted features.

## Finding verification
**QA-LIVE-001 — fixed.** Copied the previous `independent.spec.ts` byte-for-byte into owned QA output. The original held-Space test starts on A, replaces it with B, sends native repeated keydown and releases Space. It now produces no history entry. Passed once in the complete independent probe run and three additional repetitions.

The gesture implementation captures a copied/frozen suggestion once, prevents browser default keyboard activation, ignores repeated keydown, and explicitly activates Enter on down / Space on matching up. Stale and canceled snapshots do not fall back to a replacement. New deliberate gestures remain functional.

## Real execution
| Check | Result |
|---|---|
| `npm ci` | PASS; audit reported zero vulnerabilities |
| `npm run check` | PASS; typecheck and 158 unit/regression tests, 19 files |
| `npm run build` | PASS |
| `MVP_PORT=4251 npx playwright test --reporter=list --output=research/qa-live-candidate-fixed/full-results` | **104 passed**, first independent run, 39.0s |
| `npx playwright test -c research/qa-live-candidate-fixed/playwright.qa.config.ts` | **16 passed**, 14.2s |
| Same QA config with `--grep 'held Space autorepeat preserves original identity' --repeat-each=3 --reporter=list --output=research/qa-live-candidate-fixed/repeat-results` | **3 passed** |

Independent probes comprise the seven original unchanged tests plus nine new lifecycle checks: fresh pointer, Space, Enter and click-only assistive-style confirmation; held Space/Enter dismissal; Enter repeat after accepting A; Space canceled across stop/restart; pointer cancellation followed by fresh pointer confirmation. Runtime errors are asserted empty in the new lifecycle probes. Maintained suite also verifies Space/Enter replacement with metadata availability cases, button blur, window blur, pointercancel and fresh-key recovery. Original security rendering, provider identity, settings and stale manual-selection checks remain green.

## Integrity and cleanup
All **112 baseline files** retain their initial hashes, with no unexpected additions outside the owned QA evidence folder. Original reproduction byte identity, expected patch hash and HEAD were verified; reverse patch check passed. Playwright-managed server processes exited; **port 4251 has no listener**. No access to port 4195.

Evidence folder: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-live-candidate-fixed/research/qa-live-candidate-fixed/` — `full.log`, `probes.log`, `repeat.log`, probe JSON/traces/screenshots, unchanged original spec, independent lifecycle spec, adapted config, and `verification.json`.

## Remaining caveats
- Historical intermittent `smoke.spec.ts:75` timeout remains **undiagnosed**, not resolved by this passing run. Preserve prior failure evidence; do not claim unconditional suite stability.
- Synthetic camera/worker/provider and desktop Chromium/mobile-viewport coverage only. No physical-device, real recognition accuracy or sustained-performance acceptance. Click-only activation is not a screen-reader device test.
- No private inputs, model downloads, uploads or deployment. Scoped security review is not a complete audit.
- Nonblocking suggestion: promote the additional dismissal/restart/accepted-Enter-repeat probes into maintained regression coverage.
