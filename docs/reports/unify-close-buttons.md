# Unify close buttons to × SVG icon

Branch: `feat/unify-close-buttons`, base `792d622`. No commit, push or deploy; all changes uncommitted.

## Changed files
- `src/ui/close-button.ts` (new): `closeIconButton(action)` builds a button with `aria-label`/`title` 閉じる and an SVG × (`document.createElementNS`, line art, `currentColor`, same attributes as the gear icon). Shared helper, no duplication.
- `src/main.ts`: drawer close (was text `補助画面を閉じる`) and detail-sheet close (was text `×`) both use `closeIconButton`. These are the only close controls; 他の候補 is a drawer route and shares the drawer close.
- `src/ui/style.css`: `.close-icon-button` (44px min target, centered); removed text-sizing rule on detail close.
- `tests/browser/unify-close-buttons.spec.ts` (new): icon-only drawer close, SVG detail close without × text, both share identical glyph markup.
- Selector updates (behavior unchanged, `補助画面を閉じる` -> `.utility-drawer` scoped role `閉じる`): `intro-hint-alt-candidates.spec.ts`, `candidate-immersive.spec.ts`, `immersive-routes.ts`. Scoping avoids strict-mode ambiguity with the detail sheet's 閉じる.

## RED / GREEN
1. `npm run build` then `MVP_PORT=4304 npx playwright test unify-close-buttons --project=desktop`: RED, 3 failed (no SVG, drawer name still `補助画面を閉じる`, detail had × text).
2. After implementing helper: `npm run check` PASS (24 files / 177 tests), `npm run build` PASS.
3. First full run after implementation, before updating old selectors: failures in specs still using `補助画面を閉じる` (expected, selector-only).
4. After selector updates: `npm run check` PASS, `npm run build` PASS, `MVP_PORT=4304 npx playwright test`: 300 passed (desktop + mobile-viewport).

## Screenshots (testInfo.outputPath)
`test-results/unify-close-buttons-drawer-*-desktop/drawer-close.png` and `test-results/unify-close-buttons-detail-*-desktop/detail-close.png` (and mobile-viewport equivalents). Playwright removes these directories at the start of the next run; re-run the spec to regenerate. I did not visually inspect them.

## Limits
SYNTHETIC camera/worker/provider fixtures. Real iPhone Safari: NOT RUN.
