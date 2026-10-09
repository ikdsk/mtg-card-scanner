# Hareruya search parameter fix

Branch: `fix/hareruya-search-param` (base 8934d78). Not committed, pushed or deployed.

## Problem
`externalLinks()` built `https://www.hareruyamtg.com/ja/products/search?name=<q>`. Hareruya's search form (`<input name="product">`) ignores `name`, so the page showed all products with an empty search box.

## Changed files
- `src/data/external-links.ts` — `?name=` -> `?product=` (Hareruya only; Wisdom Guild untouched)
- `tests/unit/external-links.test.ts` — expectations updated to `?product=`
- `tests/browser/external-links.spec.ts` — 3 href assertions updated to `?product=`
- `docs/reports/hareruya-search-param-fix.md` — this report

## RED / GREEN
- RED (tests updated, source unchanged): `npx vitest run tests/unit/external-links.test.ts` -> 2 failed, 3 passed (received `?name=%E7%A8%B2%E5%A6%BB`, expected `?product=...`).
- GREEN (after fix): same command -> 5 passed.
- `npm run check` -> 26 files / 196 tests passed (typecheck OK).
- `npm run build` -> built OK.
- `npx playwright test` (port 4319 confirmed free via lsof beforehand) -> 336 passed.
- Note: `npm ci` was run in this worktree first because node_modules was absent (no package files changed).

## Real URL verification (curl, not part of the test suite; 2026-10-09)
`curl -sL -A 'Mozilla/5.0' 'https://www.hareruyamtg.com/ja/products/search?<k>=%E7%A8%B2%E5%A6%BB'`
- `product=`: HTTP 200; server HTML contains `value="稲妻"` in the search input (8 occurrences of 稲妻).
- `name=`: HTTP 200; 0 occurrences of 稲妻, search box empty (the bug).

## Known limits
- Result counts (e.g. 980 hits) were not confirmed by me: the result list appears to be rendered client-side, so curl cannot count it. Only the server-side echo of the query into the input was verified. Visual confirmation in a browser is still worth doing.
- Playwright tests stub external requests; they only prove the generated href, not Hareruya's behavior.
- Hareruya may change its form parameter again; there is no automated check against the live site.
