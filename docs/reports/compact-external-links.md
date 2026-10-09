# compact-external-links report

Branch feat/compact-external-links (base b6dbd21). Not committed, not pushed, not deployed.

## Changed files
- `src/main.ts` — new `compactWisdomLink`/`compactHareruyaLink` (labels 「Wisdom Guild」「晴れる屋」) in `.candidate-compact-links`, appended to `tentativeSummary`. `renderExternalLinks()` now updates both pairs, so every caller (live `showCard`, `applyJapanese`, history/static view) keeps them in sync.
- `src/ui/style.css` — pill style, grid placement under the format badges (row 4; row 5 when the dock is expanded, where the reference-image actions use row 4), `display:none` inside `.candidate-detail-sheet` (no duplicate there), and `--dock-height` 214px -> 252px (+38px) so the new row is not clipped.
- `tests/browser/external-links.spec.ts` — 3 new tests (existing 3 unchanged).
- `docs/reports/compact-external-links.md`, `docs/reports/compact-external-links/*.png`.
Not edited: package.json, lockfile, tsconfig, .github, docs/contracts.md. (`npm ci` was run to install dependencies in this worktree.)

## RED / GREEN
- RED: `MVP_PORT=4319 npx playwright test tests/browser/external-links.spec.ts --project=desktop` -> 3 existing passed, 3 new failed (compact links not found).
- GREEN: same file, both projects -> 12 passed. (First attempt: the history test read hrefs before the Japanese name loaded; fixed by polling with `expect.poll`, not by weakening.)
- Full-suite regression: the first full run failed 4 `format-legality.spec.ts` "long DFC 320/390px" cases (`.candidate-summary` overflowed because the fixed dock height clipped the new row). Fixed by raising the dock height; tests untouched.
- Final: `npm run check` -> 196 unit tests passed; `npm run build` OK; `MVP_PORT=4319 npx playwright test` (4319 free per lsof) -> 336 passed.

## Screenshots (synthetic data, desktop Chromium viewport emulation)
- `docs/reports/compact-external-links/compact-320.png`, `compact-390.png` — links sit below the format badges; no overlap with image, name, set, price or badges; `.candidate-summary` has no overflow at either width.
- `docs/reports/compact-external-links/detail-320.png`, `detail-390.png` — detail sheet shows no compact links (only the existing 外部リンク section).

## Known limits
- The pill is 32px tall (not 44px), as allowed for a secondary link.
- The dock is 38px taller in the collapsed state, reducing camera viewport height by that amount on all screens.
- Expanded-dock (`data-expanded=true`) layout was reasoned about (row 5), not screenshot-verified.
- Real iPhone Safari: NOT RUN. No external site is contacted by tests.
