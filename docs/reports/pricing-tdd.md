# PRICE-01 TDD execution report

## Scope and environment

- Implementer model: `gpt-6.1-sol`.
- Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/price-sol`.
- Branch: `feat/price-domain-sol`.
- Base commit: `8ac6be91df807b0c34ea066272e510a8a926697e`.
- Node `v24.2.0`; npm `11.3.0`.
- Read AGENTS.md, docs/contracts.md, docs/agent-briefs.md and docs/development-plan.md before implementation.
- Used existing `software-development/test-driven-development/SKILL.md` (read with read_file; skill_view tool unavailable).
- Owned paths only: src/domain/pricing.ts, tests/unit/pricing.test.ts, docs/reports/pricing-tdd.md.
- `npm ci`: exit 0; added 83 packages, audited 84 packages, 0 vulnerabilities. No dependency/config/lockfile edits.

## Executed RED/GREEN evidence

For every numbered cycle below, command was exactly:

```sh
npm test -- tests/unit/pricing.test.ts
```

Each RED was executed before the corresponding behavior implementation, then the entire pricing unit file was rerun for GREEN. Fixtures within each test cover variations of that single behavior. The initial exported function was a throwing scaffold so the first failure was a missing implementation, not an import error.

| Cycle | Behavior | Observed RED (exit 1) | Minimal change | Observed GREEN (exit 0) |
|---|---|---|---|---|
| 1 | Missing USD | 1 failed; Error: Not implemented | Return both null | 1 passed |
| 2 | Valid trimmed USD including zero, no default FX | 1 failed / 1 passed; expected $1,234.50, received null | en-US USD formatting | 2 passed |
| 3 | Nonnegative decimal syntax, at most two fractional digits | 1 failed / 2 passed; empty input produced $0.00 instead of null | Trim and validate decimal grammar | 3 passed |
| 4 | Exact USD cents and safe integer bound | 1 failed / 3 passed; maximum safe cents formatted .90 instead of .91 | Parse cents as BigInt, validate bound, replace Intl fraction part with exact cents | 4 passed |
| 5 | Supplied FX to ja-JP JPY, zero retained | 1 failed / 4 passed; expected ￥1,851, received null | Add FX conversion and JPY label | 5 passed |
| 6 | Nonpositive/nonfinite FX | 1 failed / 5 passed; zero FX produced ￥0 instead of null | Positive finite rate guard | 6 passed |
| 7 | Strict ISO calendar dates/timestamps | 1 failed / 6 passed; empty asOf produced ￥150 instead of null | ISO syntax and Gregorian calendar validation, including leap centuries | 7 passed |
| 8 | Decimal round-half-up | 1 failed / 7 passed; 0.29 × 50 yielded ￥14 instead of ￥15 | Exact integer rational product and half-up quotient | 8 passed |
| 9 | JPY overflow preserves USD | 1 failed / 8 passed; expected JPY null, received ￥9,007,199,254,740,992 | Bound rounded BigInt yen by MAX_SAFE_INTEGER | 9 passed |

Cycle 9 RED was run in the initial session (which hit the tool-call limit), then reproduced unchanged on continuation: 8 passed / 1 failed, exit 1. After adding the bound, 9 passed, exit 0. No test assertions were weakened to pass.

Supplemental regression (not claimed as a RED/GREEN implementation cycle): added a test rejecting final LF/CR on FX asOf. It passed immediately with the existing strict regex: 10 passed, exit 0. No implementation change was needed. This checks existing behavior, not evidence of a new feature's RED.

## Contract coverage and decisions

- Export exact FxRate, PriceDisplay and formatReferencePrice signature; labels only.
- Missing, negative, nondecimal, excessive precision and unsafe USD return both null. Whitespace trimmed only on USD; zero is a real price.
- USD uses en-US USD formatting with exact two-place cents, including the maximum safe cents boundary.
- Missing/invalid FX retains USD and returns null JPY; no invented default rate.
- asOf validates extended `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss[.fraction][Z|±HH:mm]`. Zone-less timestamps are validated lexically, never interpreted in a local timezone. Invalid days, leap dates, times and offsets are rejected without Date normalization or system-clock access. No freshness policy is inferred from asOf.
- FX decimal value comes from the supplied number's canonical `toString()` representation, including scientific notation. BigInt rational arithmetic avoids intermediate binary rounding; nonnegative yen rounds half up. Original rate precision lost before reaching this number-typed API cannot be reconstructed.
- USD cents and rounded JPY are bounded separately by MAX_SAFE_INTEGER. FX-only overflow preserves USD; even the largest finite FX applied to zero yields zero JPY.
- Pure computation: no HTTP, storage, clock, input mutation or source/matching/freshness claims.

## Final verification

- `npm run check` after cycle 9: exit 0; TypeScript noEmit passed, 9 tests passed.
- Final `npm run check` after supplemental regression: exit 0; TypeScript noEmit passed, 1 test file / 10 tests passed.
- `git diff --check`: exit 0. Before report creation, git status showed only the two owned new code/test files; tracked root files unchanged.
- All RED and GREEN counts above come from actual Vitest execution, not synthesized outputs.

## Limits and handoff

All USD/FX fixtures are synthetic. This is not evidence of live prices, provider behavior, real card recognition, camera operation, or mobile performance. HTTP/live pricing, model downloads, deployment, independent integration/QA and human device tests: NOT RUN / out of this task's scope.

No edits to root configuration, dependencies or lockfile. No writes to old PRICE, STATE, TEST, main or other worktrees. No push, merge, external provider access or model download. Only npm ci was used for dependency preparation. The final commit is limited to the three owned paths; its SHA is returned in the handoff response rather than embedded self-referentially here.

No remaining implementation blocker. Coordinator still needs independent integrated-candidate TEST/QA verification.
