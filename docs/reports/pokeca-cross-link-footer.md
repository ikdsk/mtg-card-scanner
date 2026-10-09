# Pokéca Scanner cross-link in the app footer

Branch: `feat/pokeca-footer-link` (base 8d4c24c). Not committed, pushed or deployed.

## Changes
- `src/main.ts` — new `<p class="small">` right after the AGPL line in the footer: 「ポケモンカード版の [Pokéca Scanner](https://ikdsk.github.io/pokeca-scanner/) もあります」. Built with the existing `externalLink()` helper (`target="_blank" rel="noopener noreferrer"`); the anchor has `id="sister-app-link"`.
- `tests/browser/external-links.spec.ts` — one new test asserting the link is visible in the settings drawer's footer with the right href/target/rel.
- No CSS change (the existing `small` paragraph style fits). No change to package.json, package-lock.json, tsconfig.json, .github/ or README.
- No existing footer/sources test was affected.

## Results
- `npm ci` was run first because node_modules was absent (no package files changed).
- `npm run check` -> typecheck OK, 26 files / 196 tests passed.
- `npm run build` -> built OK.
- `npx playwright test` with `MVP_PORT=4331` (confirmed free via lsof) -> 338 passed (336 before + the new test in desktop and mobile-viewport projects). I did not run the new test RED first (written after the source change), so there is no RED result for it.

## Screenshot
`docs/screenshots/pokeca-cross-link-footer.png` — 390x844 mobile viewport, settings drawer with 情報・プライバシー open. Link sits between the AGPL notice and the third-party licenses link.

## Limits
- The link target was not fetched; tests only check the generated href. The Pokéca Scanner site being live was not verified.
- The screenshot is desktop Chromium emulating a mobile viewport, not iPhone Safari.
