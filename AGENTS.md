# Development operating rules

## Product constraints
- MVP: one-card scan, Japanese-friendly metadata, Scryfall USD plus approximate JPY.
- Manual printing/language/finish override is required. Deck and inventory management are out of MVP.
- Startup and scan latency are product value, not optional later optimization.
- No default camera image upload; no live price or recognition result fabrication.
- Read docs/development-plan.md, docs/contracts.md and assigned brief before editing.

## Model assignment
- Coordinator (planning/integration/verification) uses Claude Opus 5.5.
- Implementation subagents use Claude Sonnet 5.5 via the Claude Code CLI, as explicitly requested by the user.
- Pin the model per worker process; do not silently fall back to another model.
- TEST/QA remain independent; changing implementation models does not change the coordinator or global defaults.

## Isolation and ownership
- One agent = one branch = one git worktree; never share a writable checkout.
- Main checkout is for coordinator integration only. Agents cannot checkout/reset/stash/clean there.
- Worktrees live next to the repo in /Users/dikeda/workspace/mtg-card-scanner-worktrees/<role>.
- Never remove a worktree with uncommitted changes or use force to hide conflicts.
- Coordinator alone owns package.json, package-lock.json, tsconfig.json, .github/, shared contracts and integration.
- Dependency or contract change: propose to coordinator, wait for approved base commit, then rebase.
- Commit only owned paths; no git add .; no independent pushes/merges unless explicitly delegated.
- Code owners are documented in docs/agent-briefs.md. Worktree isolation does NOT replace file ownership.

## Quality
- Strict TDD: one behavior RED -> GREEN -> refactor; preserve real commands and outcomes in the assigned report.
- Unit tests belong to implementer. Independent TEST agent owns integration/regression tests; QA agent reviews separately.
- No test weakening, skips or threshold relaxation to obtain green without review.
- Mocked fixtures are labeled. Passing mock tests does not prove real recognition, provider behavior, or mobile performance.
- Validate combined candidate in a separate worktree at a pinned commit, not just each branch independently.
- A review agent using the same GitHub account is not a distinct GitHub approving reviewer.
- No public deploy, paid service purchase, license purchase, image upload, or committed secrets without user approval.

## Reporting
- Return branch, commit, changed paths, RED/GREEN results, limits and blockers.
- Independent review findings: severity, file/line, reproduction, expected/actual, fix recommendation.
- Human device tests remain NOT RUN until evidence exists; desktop WebKit is not iPhone Safari.
