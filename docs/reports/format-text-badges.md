# Format text badges

- Branch: `fix/format-text-badges`
- Base/HEAD: `4d649e32938115fff6cfebb315d3aea595e55b9c` (uncommitted changes; no commit/push/deploy).
- Scope: this dedicated worktree only. Read AGENTS.md, development-plan, contracts and agent briefs before editing.

## Result and changed paths

- `src/ui/format-legality.ts`: visible labels exactly スタン、パイオニア、モダン、レガシー、ヴィンテ、統率者、パウパー in existing paper-format order. Full Japanese/English names and actual status remain in accessible names/disclosures. Same reusable widget remains in candidate and result.
- `src/ui/style.css`: only existing scoped format rules changed. All statuses use 88×32 CSS px rectangles, 6px corners, fixed flex basis and nowrap 12px labels (including five-character パイオニア). Legal uses white on #252525 (approximately 15.3:1); unavailable/banned/not_legal use grayscale. Restricted retains a distinct double-weight border and ¹, banned ×, not_legal – and unknown ? plus dashed border. No placement selectors changed.
- `tests/unit/format-legality.test.ts`: exact label/order regression added; existing status/unknown tests preserved.
- `tests/browser/format-legality.spec.ts`: geometry, text, order, accessible state distinctions, keyboard/click details, focus/scroll and overflow at 320/390/1280. Synthetic camera/worker/provider fixture also checks the same widget in expanded candidate.
- `docs/reports/format-text-badges.md`: this report.

## Actual TDD and verification

1. `npm ci`: PASS, 87 packages, zero audit vulnerabilities.
2. RED `npx vitest run tests/unit/format-legality.test.ts`: 1 failed / 1 passed. Exact Japanese badge test received S/P/M/L/V/C/Pa.
3. GREEN same command after label implementation: 2 passed.
4. `npm run build`: PASS (labels with old geometry, before geometry implementation).
5. RED `MVP_PORT=4281 npx playwright test tests/browser/format-legality.spec.ts --grep 'uniform' --project=desktop`: 3 failed at 320/390/1280. Actual width=height=44; expected rectangular width greater than height.
6. GREEN after scoped CSS change: `npm run build` then `MVP_PORT=4281 npx playwright test tests/browser/format-legality.spec.ts`: 14 passed.
7. Added candidate reuse coverage without altering production behavior. `MVP_PORT=4281 npx playwright test tests/browser/format-legality.spec.ts tests/browser/combined-camera-ui.spec.ts`: 26 passed (desktop Chromium plus mobile viewport Chromium). Combined tests unmodified.
8. Final `npm run check`: PASS, typecheck and 21 files / 164 unit+regression tests. `npm run build`: PASS. `git diff --check`: PASS.

All browser responses, camera stream and recognition worker outputs are explicitly SYNTHETIC. The tests check all five status classes at identical geometry, longest label fit, candidate/result container overflow, Enter/Space focus/scroll stability, banned vs not_legal accessible explanations, card reset and late FX preservation. Existing unknown/restricted semantics are retained; unknown is never inferred legal.

## Screenshots

Portable paths generated through `testInfo.outputPath`; artifacts are ignored, not source changes. All 12 width-specific screenshots are under `test-results/` (desktop and mobile-viewport projects). Representative paths:

- `test-results/format-legality-uniform-Ja-1413e-t-320px-across-every-status-desktop/synthetic-format-320.png`
- `test-results/format-legality-uniform-Ja-85b63-t-390px-across-every-status-desktop/synthetic-format-390.png`
- `test-results/format-legality-uniform-Ja-e8563--1280px-across-every-status-desktop/synthetic-format-1280.png`
- `test-results/format-legality-candidate--32e81--badges-at-320px-SYNTHETIC--mobile-viewport/synthetic-candidate-format-320.png`
- `test-results/format-legality-candidate--1d7b7--badges-at-390px-SYNTHETIC--mobile-viewport/synthetic-candidate-format-390.png`
- `test-results/format-legality-candidate--34103-badges-at-1280px-SYNTHETIC--desktop/synthetic-candidate-format-1280.png`

Visually inspected result 390 and candidate mobile-viewport 320 screenshots: all labels readable, identical rectangles, grayscale status indicators and complete status disclosure.

## Limits and blockers

No task blocker. Real phones/iPhone Safari/Android Chrome, screen reader hardware and human touch usability: NOT RUN. The requested small badge is a 32px-high button with 8px spacing; real-device touch comfort remains unverified. Synthetic Chromium checks do not prove recognition accuracy, live provider behavior or mobile performance. Independent TEST/QA and the coordinator's combined candidate with other isolated workers are NOT RUN here. No dependencies, configs, contracts, main checkout, other worktrees or unrelated selectors changed.
