# Mana Peek link on the idle (pre-camera) intro — report

Branch `feat/intro-pokeca-link` (worktree `intro-pokeca-link`), base `e962216`. Nothing committed, pushed or merged before this coordinator review; diff was reviewed and verified by the coordinator.

## Changes
- `src/main.ts` — after the cameraIntro paragraph「結果をタップすると詳細が開きます。残したいカードは「履歴に保存」。」, added `p.small.intro-pokeca` with an `externalLink('ポケカ版はこちら →')` → `https://ikdsk.github.io/pokeca-scanner/`, `id="intro-pokeca-link"`. Variables `introPokeca` / `introPokecaLink` (no clash with the footer's `sister` / `sisterLink`; both links coexist). It lives inside `cameraIntro`, so it hides with the intro while scanning.
- `src/ui/style.css` — one added rule: `.camera-intro .intro-pokeca a{pointer-events:auto;color:#d9ddeb;display:inline-block;padding:6px 0}`. Needed because `.camera-intro` has `pointer-events:none`, which would otherwise make the link unclickable. No existing rule changed.
- `tests/browser/mana-peek-intro.spec.ts` — new test: link visible in the intro with correct text/href/target/rel.
- Untouched: `package.json`, `package-lock.json`, `tsconfig.json`, `.github/`.

## Verification (real commands, coordinator review 2026-10-09)
- `npm run check` — typecheck OK; vitest 26 files / 196 tests passed.
- `npm run build` — OK.
- `npx playwright test` (port 4319 checked free with `lsof`) — **340 passed** (desktop + mobile-viewport).
- Screenshot (390×844, Chromium, idle intro): the link sits as a small underlined line directly under the history-save text, below the "MTGカードをかざして..." paragraph, above the camera status line. It does not overlap the heading, logo, スキャン開始 button, the start hint arrow or the gear.
- Responses are SYNTHETIC. Real-device (iPhone Safari) check: NOT RUN.
