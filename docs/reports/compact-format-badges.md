# Compact format badges

- Branch: `fix/compact-format-badges`.
- Base/HEAD: `5f3e904be8e5a247f73004e9b05d5c09de3a207b`; changes remain uncommitted as requested. No push/deploy.
- Read AGENTS.md, development-plan, contracts and agent briefs. Only this dedicated worktree edited; no dependencies/config/contracts changed.

## Changes

- `src/main.ts`: move the single candidate format group from collapsed details into the always-visible summary after price. Reattach it to that same summary on candidate replacement/restart; expanded mode retains the same controls. Identity, confirmation, sticky races and providers unchanged.
- `src/ui/style.css`: shared equal 52×20 CSS-pixel rectangles, 10px labels, −0.7px letter spacing, 2px horizontal padding, 3px corners and 4px gaps. Exact seven labels preserved: スタン、パイオニア、モダン、レガシー、ヴィンテ、統率者、パウパー. Existing legal/banned/not-legal/restricted/unknown distinctions and accessible disclosures retained. Candidate group spans the summary width. Content-sized grid rows prevent price overlap; compact dock budget increases 24px to accommodate the extra row.
- `tests/browser/format-legality.spec.ts`: replace obsolete expanded-details location and 88×32 requirement with compact summary, 52×20 geometry, text fitting and font ≥10px, all seven fully visible at 320×740/390×844/440×780, no summary overflow or price overlap, photo/name/physical set/confirmation visibility, one group in both panel states, Enter/Space disclosure and expanded focus/scroll checks. Synthetic reference image fixture added. Screenshots use testInfo.outputPath; geometry attached as JSON.
- `docs/reports/compact-format-badges.md`: this report.

## Actual RED / GREEN and checks

- `npm ci`: PASS, 87 packages; zero audit vulnerabilities.
- Initial test harness attempt failed on an ambiguous strong locator; corrected the locator and added a count assertion before iterating controls.
- Behavioral RED: `MVP_PORT=4291 npx playwright test tests/browser/format-legality.spec.ts --grep 'candidate.*320' --project=desktop`: FAIL, expected 7 summary badges, received 0 (5f3e904 production).
- After moving both initial placement and per-candidate reattachment: `npm run build` PASS; `MVP_PORT=4291 npx playwright test tests/browser/format-legality.spec.ts --grep candidate`: 6 PASS.
- Initial full E2E: `MVP_PORT=4291 npm run test:e2e`: 222 PASS. Visual inspection nevertheless found price text overlapping badges. Added an assertion against that observed defect before fixing it.
- Second RED, same 320px command: FAIL at price-child bottom ≤ format-group top, actual false.
- GREEN: after content-sized grid rows and extra dock budget, `npm run build` PASS; `MVP_PORT=4291 npx playwright test tests/browser/format-legality.spec.ts tests/browser/candidate-immersive.spec.ts`: 50 PASS, including short viewport/keyboard/large-text regressions.
- Final `npm run check`: PASS, typecheck and 22 files / 167 unit+regression tests.
- Final `MVP_PORT=4291 npm run test:e2e`: PASS, 222 tests across desktop Chromium and mobile-viewport Chromium (1.3m), after all code and assertion changes.
- Final `git diff --check`: PASS. Build PASS after final production changes. No thresholds relaxed or tests skipped.

## Screenshots and measurements

Screenshots generated through `testInfo.outputPath`, ignored artifacts in this worktree:

- `test-results/format-legality-candidate--32e81--badges-at-320px-SYNTHETIC--desktop/synthetic-compact-candidate-320.png`
- `test-results/format-legality-candidate--1d7b7--badges-at-390px-SYNTHETIC--desktop/synthetic-compact-candidate-390.png`
- `test-results/format-legality-candidate--1b8f0--badges-at-440px-SYNTHETIC--desktop/synthetic-compact-candidate-440.png`

The same directories with `mobile-viewport` instead of `desktop` contain the mobile viewport evidence. Expanded screenshots are `synthetic-candidate-format-<width>.png` in each directory. All three desktop compact screenshots visually inspected after the overlap fix.

| Viewport | Badge geometry | Text | Wrapping | Overflow / overlap |
| --- | --- | --- | --- | --- |
| 320×740 | all 7: 52×20px | 10px, fitted | 5 + 2 | none |
| 390×844 | all 7: 52×20px | 10px, fitted | 6 + 1 | none |
| 440×780 | all 7: 52×20px | 10px, fitted | 7 | none |

Measurements use DOM bounding rectangles and computed font sizes, label scrollWidth/clientWidth, summary scrollWidth/clientWidth and scrollHeight/clientHeight, and price-child bottoms versus badge-group top. All seven buttons, photo, name, physical set and confirmation have full viewport intersection. 4px row/column gap produces 44px groups at 320/390 and a 20px group at 440. Confirmation buttons retain 42px minimum height. Accessible full names and status explanations are preserved; compact Enter opens restricted status and Space closes it without confirming the card. Keyboard status disclosure may use the summary's internal scroll when open; confirmation remains visible.

## Limits

All camera pixels, worker outputs, card/image/price/FX responses in these tests are SYNTHETIC. They do not establish real recognition accuracy, live provider behavior or mobile performance. Human iPhone Safari/Android Chrome, real-device touch usability and screen reader hardware: NOT RUN. Independent TEST/QA and coordinator combined-candidate validation: NOT RUN here. No release approval implied. No known task blocker.
