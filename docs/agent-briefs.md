# Agent briefs and ownership

Every task starts from the coordinator-provided exact base commit using a separate worktree. No agent is a permanent autonomous daemon; the coordinator dispatches bounded tasks and reviews results.

| Role | Owned paths | First deliverable |
|---|---|---|
| LEAD | root config, .github/, docs/development-plan.md, docs/contracts.md, AGENTS.md | contracts, integration, go/no-go |
| PRICE | src/domain/pricing.ts, tests/unit/pricing.test.ts, docs/reports/pricing-tdd.md; later src/data/ | USD/JPY pure formatter via TDD; no live source yet |
| STATE | src/domain/selection.ts, tests/unit/selection.test.ts, docs/reports/selection-tdd.md | immutable manual override and stale-response guards via TDD |
| VISION | later src/recognition/, tests/recognition/, docs/research/recognition.md | legal/runtime/cold-start spike, real-image evidence |
| UI | later src/ui/, tests/ui/ | camera shell + Japanese info panel against approved contracts |
| TEST | tests/regression/, tests/e2e/, docs/reports/independent-test.md | independent adversarial cases; not implementation-owned test assertions |
| QA | docs/qa/, artifacts (ignored) | pinned-candidate exploratory/regression/performance report, no product fixes |

## PRICE / STATE task prompt
Read AGENTS.md and docs/contracts.md. Implement only assigned paths. Follow strict one-case-at-a-time RED/GREEN TDD. Execute each failure before adding behavior. Do not edit lockfiles, dependencies or contracts. Commands: npm ci; npm run check. Test fixture strings/IDs are synthetic and must not be described as provider observations. Record actual test evidence; commit owned files and return commit ID. No push.

## TEST task prompt
Use pinned integrated candidate in your own worktree. Read contract independently; add tests only under tests/regression/. Exercise null vs zero, bad FX and rounding boundaries, manual override races and generation reset. Run npm run check; report failures without changing production code or weakening assertions. Commit tests and report only. No push. Root dependency needs go to coordinator.

## QA task prompt
Use a detached dedicated worktree at provided candidate SHA. Read plan and contracts; verify claims, changed code, tests, docs, license/privacy boundaries. When UI exists, test Japanese text, camera permission denied, offline, stale response, manual edition/finish, background/resume, zoom and long names. Evidence includes commit/device/browser/conditions/steps/expected/actual/screenshots where applicable. Mark absent UI/live data/real phone measurements NOT RUN; never certify scanner quality from unit tests. Write docs/qa/<candidate>-review.md only. No product edits or push.

## Worktree flow
Coordinator creates base and worktrees, e.g.:

```sh
git worktree add ../mtg-card-scanner-worktrees/price -b feat/price-domain main
git worktree add ../mtg-card-scanner-worktrees/state -b feat/selection-domain main
```

Coordinator reviews commits and combines them on an integration branch. TEST receives the exact combined SHA in its worktree. QA receives the exact candidate SHA after TEST. Findings go back to the owning agent/worktree; rerun affected tests AND whole integrated suite. Publish candidate branch/PR only after local checks. Never blindly cherry-pick shared-file conflicts. Clean worktrees only after verifying clean state and retained commits.
