# dfc-partial-japanese report

Base commit 92a8f1a, branch fix/dfc-partial-japanese. Not committed, not pushed.

## Bug
For Japanese printings whose faces are translated asymmetrically (Hearth Elemental // Stoke Genius: front `printed_name` still English, adventure face Japanese), `japaneseName()` required every face to be Japanese (`faces.every(Boolean)`). It returned null, so the candidate heading showed "日本語名は利用できません" and `japaneseDisplay()` rejected the printing.

## Changed files
- `src/data/japanese-name.ts` — relaxed `japaneseName` (only source change).
- `tests/unit/japanese-name.test.ts` — new partial-translation test; one old assertion updated (see below).
- `tests/browser/dfc-metadata.spec.ts` — new partial-translation browser test (en and ja physical).
- `tests/fixtures/hearth-elemental.json` — new fixture.
- `docs/reports/dfc-partial-japanese.md` — this report.

`src/main.ts` needed no edits: every use (`showCard`, `applyJapanese`, `commitSuggestion` path, alternatives, history names, search results) goes through `japaneseName`/`japaneseDisplay`, so they follow the new behavior. `facePanel` is untouched.

## Design decision
`japaneseName(card)` keeps its signature (`Card -> string | null`). Meaning change: for a `ja` multi-face card with at least one Japanese face name, it returns the face names joined by ` // `, with untranslated faces kept as their English `name` (e.g. `Hearth Elemental // 火（ひ）おこしの天（てん）才（さい）`). It still returns null when no face has a Japanese name (including the existing all-English delver-ja[0] fixture) or for non-ja cards. Because the signature is unchanged, all callers stay consistent and `japaneseDisplay` now accepts partially translated printings.

Heading vs face level: the heading is card-level and says "日本語名は利用できません" only when no face is translated. `facePanel` still shows that text per untranslated face (verified in the browser test: face 0 unavailable, face 1 Japanese).

## RED / GREEN
- RED unit: `npx vitest run tests/unit/japanese-name.test.ts` -> 1 failed (`expected null to be 'Hearth Elemental // 火（ひ）おこしの天（てん）才（さい）'`).
- RED browser: `MVP_PORT=4310 npx playwright test tests/browser/dfc-metadata.spec.ts -g "partially translated"` -> 4 failed (en/ja x desktop/mobile), heading was "日本語名は利用できません".
- GREEN: `npm run check` -> 25 files / 189 tests passed; `npm run build` OK; `npx playwright test` on port 4310 (lsof confirmed free) -> 324 passed.

## Existing test updated (behavior change, not weakened)
`tests/unit/japanese-name.test.ts` asserted `japaneseName` is null when one face was English. That is the old behavior being fixed. It now asserts null when *all* faces are English (stricter on that axis is preserved; the one-face case is covered by the new test). Existing "日本語名は利用できません" browser tests (all-English delver-ja[0], synthetic unavailable) pass unchanged.

## Known limits
- The fixture is SYNTHETIC: shaped like the described Scryfall data, with placeholder rules text and invented IDs. It is not a verbatim Scryfall snapshot, and no live Scryfall check was made.
- The heading mixes English and Japanese for such cards by design. The contract line "English is never relabelled as Japanese" is respected per face, but docs/contracts.md (coordinator-owned) was not updated; coordinator may want to note the partial case.
- `japaneseDisplay` does not prefer a fully translated printing over a partially translated one from a different set.
- The Japanese rules panel for a partially translated card shows `printed_text` or "日本語印刷本文なし" per face; an untranslated face with English printed_text would appear under the Japanese section.
- With the default `webServer` config, `npx playwright test` on 4310 repeatedly hit ERR_CONNECTION_REFUSED mid-run (server exited; cause not investigated). The passing run used a separately started `vite preview` on 4310 with `PLAYWRIGHT_NO_SERVER=1`.
- `npm ci` was run in this worktree (no node_modules); package files unchanged.
