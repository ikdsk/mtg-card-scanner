# Scanner toolbar — 2026-10-05

Branch: `fix/scanner-toolbar`. Base/HEAD: `4d649e32938115fff6cfebb315d3aea595e55b9c`.
No commit, push or deployment performed. Only this isolated worktree was mutated.

Changed paths:
- `src/main.ts`: only the header settings-button construction previously at line 64.
- `src/ui/style.css`
- `tests/browser/scanner-toolbar.spec.ts`
- `docs/reports/scanner-toolbar.md`

Settings is an icon-only SVG gear using currentColor, aria-hidden SVG, and Japanese aria-label/title. A visually hidden label preserves the existing header text assertion and accessible selectors. The existing drawer callback and focus handling remain intact. Camera start/stop and settings have equal top/height and minimum 44px width/height. Actions reserve settings space; retry can wrap. A visible retry reserves 112px camera space at short heights rather than being clipped by the dock. No dependency/config/contract or recognition changes.

## Strict TDD evidence

`npm ci`: PASS, 87 packages installed, zero audit vulnerabilities (Node v24.2.0).

1. Added one layout behavior parameterized at 1280x900, 320x740, 390x844, 440x956, 320x360 and 844x390. Initial test compilation exposed tuple inference; corrected the test to a readonly tuple before behavioral RED.
   - `npm run build`: PASS on base production code.
   - RED: `MVP_PORT=4277 npx playwright test tests/browser/scanner-toolbar.spec.ts --project=desktop --workers=1`: 6 failed, settings height 36px versus required >=44px. Tests also assert equal top/height, viewport containment, no pairwise overlap, visible retry and Enter/Escape dialog focus.
   - Minimal CSS implementation.
   - GREEN: `npm run build` then same Playwright command: 6 passed.
2. Added icon/accessibility/Space activation behavior.
   - RED: `MVP_PORT=4277 npx playwright test tests/browser/scanner-toolbar.spec.ts --project=desktop --workers=1 --grep 'accessible monochrome'`: 1 failed, missing aria-label.
   - Minimal header button SVG implementation plus 44px settings width.
   - GREEN: `npm run check`: 21 files / 163 tests passed, typecheck passed; `npm run build`: PASS.
   - `MVP_PORT=4277 npx playwright test tests/browser/scanner-toolbar.spec.ts --workers=1`: 14 passed across desktop and mobile-viewport Chromium projects.
   - Regression: `MVP_PORT=4277 npx playwright test tests/browser/scanner-toolbar.spec.ts tests/browser/camera-first-design.spec.ts --workers=1`: 18 passed. Existing header text assertion, result controls and focus tests pass unchanged.
   - `git diff --check`: PASS.

## Screenshots

All new screenshots use portable `testInfo.outputPath('toolbar-retry.png')`. Paths relative to this worktree:
- ` test-results/scanner-toolbar-toolbar-al-52d7a-parates-controls-at-440x956-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-52d7a-parates-controls-at-440x956-mobile-viewport/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-6f60d-parates-controls-at-844x390-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-6f60d-parates-controls-at-844x390-mobile-viewport/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-b0dad-parates-controls-at-390x844-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-b0dad-parates-controls-at-390x844-mobile-viewport/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-c9565-parates-controls-at-320x360-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-c9565-parates-controls-at-320x360-mobile-viewport/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-ccf29-arates-controls-at-1280x900-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-ccf29-arates-controls-at-1280x900-mobile-viewport/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-d3c10-parates-controls-at-320x740-desktop/toolbar-retry.png`
- ` test-results/scanner-toolbar-toolbar-al-d3c10-parates-controls-at-320x740-mobile-viewport/toolbar-retry.png`

Visually inspected desktop-project 320x740 and 320x360 screenshots: gear, camera start/stop and retry remain separated; short viewport wraps text within controls while retaining 44px targets.

## Limits / blockers

Fixtures explicitly use SYNTHETIC denied camera permission and worker initialization failure to expose retry. They do not establish real recognition, provider behavior or mobile performance. Desktop and mobile-viewport projects use Chromium; mobile emulation is not a human phone test. Human iPhone Safari/Android tests: NOT RUN. Independent TEST/QA and combined-candidate validation at a pinned integration commit: NOT RUN, coordinator follow-up. No implementation blocker remains for the requested toolbar scope.
