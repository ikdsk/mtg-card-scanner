# Sticky verified candidate

- Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/sticky-candidate`
- Branch: `fix/sticky-candidate`
- Base / HEAD: `4d649e3` (`fix: preload recognition and resolve verified double-faced candidates`). No commit, push or deployment performed; changes are uncommitted.
- Read: AGENTS.md, docs/development-plan.md, docs/contracts.md, docs/agent-briefs.md and the user's assigned brief. No other worktree edited, no delegation, dependency/config/shared-contract changes.

## Behavior

LiveCandidate retains its proposal version through card absence, invalid corners, low score and missing/nonfinite recognition data. Repeated A observations therefore reuse A's valid pending metadata. Explicit resets, acceptance and dismissal retain deliberate clear/suppression behavior.

The main UI distinguishes the last displayed verified snapshot from the newest loading proposal. It leaves A's image, information, price and confirmation controls intact while B loads or fails verification. Exact valid metadata commits B and all its physical fields synchronously; raw printing/Oracle IDs never become display names. Face changes still create replacement versions and select the recognized DFC image. Japanese callbacks track the displayed version; physical metadata callbacks require the latest proposal and loading version. Superseded requests abort through the existing cache wrapper.

Confirmation validates the immutable displayed snapshot, so sticky A remains actionable during absence or pending B. Acceptance clears pending evidence and aborts B; a delayed B response cannot resurrect it. Dismissal clears pending evidence while preserving dismissed-identity suppression. Old pointer/held-key snapshots cannot confirm or dismiss a replacement. Stop/settings/new-session clears still invalidate callbacks. No automatic result/history path added.

## Actual RED → GREEN

1. `npm ci`: exit 0, 87 packages installed, zero reported vulnerabilities.
2. Added the single transient-evidence retention behavior to `tests/unit/live-candidate.test.ts`.
   - RED: `npx vitest run tests/unit/live-candidate.test.ts`: exit 1, **1 failed / 5 passed**. Expected version 1; absence returned undefined.
   - Minimal implementation: retain pending proposal on invalid/transient observations.
   - GREEN: same command: exit 0, **6 passed**.
3. Added pending-replacement preservation browser behavior, parameterized for B success/failure/confirmation.
   - An initial build attempt caught a test typing error (`cardId: undefined` instead of contract-valid `null`); fixed the fixture, then `npm run build` passed before browser assertions ran. This was a test typing error, not the behavioral RED evidence.
   - RED: `MVP_PORT=4275 npx playwright test tests/browser/live-candidate.spec.ts --grep 'sticky verified' --project=desktop`: exit 1, **3 failed**. A's panel became hidden while B metadata was pending (line 247 assertion).
   - Minimal implementation: separate loading proposal from displayed snapshot, commit after verification, confirm against displayed immutable version, cancel pending work on deliberate clear.
   - GREEN: same command: exit 0, **3 passed** (8.5s).
4. `npm run check` exposed the pre-existing expectation that a low score clears the candidate: **1 failed / 163 passed**. Updated only that superseded expectation/title to require retention, as explicitly requested. No skips, threshold relaxation or changes to preload/metadata/DFC/security/race assertions.
   - GREEN: `npm run check`: exit 0, **21 files / 164 tests passed**, typecheck passed.
5. Additional regression coverage (already GREEN; not claimed as a separate RED cycle): invalid corners, no-result observations, A→pending B→verified C with late B, no hidden-state transition during replacement, no raw ID and no automatic history. `MVP_PORT=4275 npx playwright test tests/browser/live-candidate.spec.ts --grep 'sticky replacement'`: exit 0, **2 passed** (desktop + mobile viewport).
6. First full run: `MVP_PORT=4275 npm run test:e2e`: exit 0, **180 passed (1.1m)**. Included original preload, metadata validation, DFC face change, held gesture, security/provider and race coverage.

## Changed paths

- `src/recognition/live-candidate.ts`
- `src/main.ts`
- `tests/unit/live-candidate.test.ts`
- `tests/unit/recognition.test.ts` (superseded low-score expectation)
- `tests/browser/live-candidate.spec.ts`
- `docs/reports/sticky-candidate.md`

## Limits

Browser additions use explicitly labeled synthetic camera, worker and provider metadata. Existing DFC tests replay provider snapshots. These are behavioral/race evidence, not real recognition accuracy, live provider behavior, latency or mobile performance evidence. Mobile viewport is desktop Chromium emulation, not iPhone Safari. Human device tests: **NOT RUN**. Independent TEST/QA and separately pinned combined-candidate validation: **NOT RUN**, coordinator responsibility; no claim of independent review. No public deployment, external image upload or secrets added. No implementation blocker found.

## Final validation

The additional MutationObserver assertion initially used `HTMLElement.hidden` directly in a boolean array; current DOM typings include the string `until-found`. Final check/build caught this test-only typing error (TS2345); the assertion now records `panel.hidden === true`. No product behavior changed for this fix.

- Final `npm run check`: exit 0; typecheck passed, **21 files / 164 tests passed** (2.05s).
- Final `npm run build`: exit 0; Vite built 25 modules, JS **52.80 kB / gzip 19.11 kB**, CSS **16.33 kB / gzip 4.07 kB**.
- Full expanded E2E `MVP_PORT=4275 npm run test:e2e`: exit 0, **182 passed (1.1m)**, own preview port 4275. This run overlapped the test-only DOM typing correction above; production bundle was unchanged. Re-ran the corrected observer/race test against the final build: `MVP_PORT=4275 npx playwright test tests/browser/live-candidate.spec.ts --grep 'sticky replacement'`: exit 0, **2 passed (3.7s)**.
- `git diff --check`: exit 0. Final working tree contains only the six listed owned paths; HEAD remains base `4d649e3`.
