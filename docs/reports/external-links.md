# external-links report

Base commit af200ac, branch feat/external-links. Not committed, not pushed, not deployed.

## Changed files
- `src/data/external-links.ts` — new. Pure `externalSearchName(card, japanese)` and `externalLinks(card, japanese)`.
- `src/main.ts` — import, `tentativeLinks` section (heading 外部リンク + two `<a>`), `externalLink()`/`renderExternalLinks()`, called from `showCard` and `applyJapanese`.
- `src/ui/style.css` — one appended rule for the link section.
- `tests/unit/external-links.test.ts` — new (5 tests).
- `tests/browser/external-links.spec.ts` — new (3 tests x desktop/mobile).
- `docs/reports/external-links.md` — this report.
No edits to package.json, lockfile, tsconfig, .github, docs/contracts.md. (`npm ci` was run to install dependencies in this worktree; it does not modify those files.)

## Behavior
- 「Wisdom Guildで見る」 -> `https://whisper.wisdom-guild.net/search.php?q=<encoded>`
- 「晴れる屋で見る」 -> `https://www.hareruyamtg.com/ja/products/search?name=<encoded>`
- Both are `<a target="_blank" rel="noopener noreferrer">`, encoded with `encodeURIComponent` (spaces become `%20`, which the sites accept as well as `+`).
- Placed in the detail sheet's `.candidate-details`, after price sources and immediately before the other-printings list. Existing `facePanel`/rules/expansion layout is untouched. The list stays the last child because an existing test asserts that; the test was not changed.
- Works identically in the live sheet and the read-only history/name-search view (same `showCard` path).
- Search-result links only: no scraping, no price fetch, no request until the user clicks. Browser test aborts any request to either host and asserts none occurs before a click.

## Design decisions
- Name: Japanese display name (`japaneseName(card)` or the `japaneseDisplay` card, same lookup as the heading) if available, else English `card.name`. It updates when the printings load, like the heading.
- Multi-face cards: the **front face name** only (text before ` // `), independent of which face is currently shown. Reason: the joined heading is not an indexed name on either site, and the front face is a stable key that finds the card. Following the flipped face would need hooks into `ReferenceImage` for little benefit. For partially translated cards (e.g. Hearth Elemental) the front face may be English; that is still a valid search.
- Plain data module so URL logic is unit-tested without DOM.

## RED / GREEN
- RED unit: the first run of `tests/unit/external-links.test.ts` failed with ERR_MODULE_NOT_FOUND, but it was a missing `node_modules` (vite) plus the missing module, so it is not clean evidence. After `npm ci` and creating the module, 1 of 5 failed only because my test misused the Hearth fixture (an `{en,ja}` object); fixed the test, then 5/5 passed. The browser test provides the clean RED.
- RED browser: `MVP_PORT=4313 npx playwright test tests/browser/external-links.spec.ts --project=desktop` -> 3 failed (links not found).
- GREEN: same command, all 6 (3 x 2 projects) passed.
- First full run exposed 2 failures in `intro-hint-alt-candidates.spec.ts` (printings list no longer last child); fixed by moving links before the list.
- Final: `npm run check` -> 26 files / 194 tests passed; `npm run build` OK; `MVP_PORT=4313 npx playwright test` (lsof showed 4313 free) -> 330 passed.

## Known limits
- Real site behavior (that the URLs return results for a given name) was not tested here; only the user-supplied confirmation of the URL shapes is relied on. No external request is made by tests.
- Double-faced cards search by front face even when the back is displayed.
- Names with no Japanese printing search the English name, which Wisdom Guild/晴れる屋 handle but may rank differently.
- Visual styling was not checked on a real device (desktop/mobile viewport emulation only).
