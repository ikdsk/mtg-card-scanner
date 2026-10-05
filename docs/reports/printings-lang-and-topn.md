# 他の印刷版の ja/en 限定と、他の候補の top-N 化

Date: 2026-10-05. Implementation writer: Claude Sonnet 5.5. Worktree `printings-ja-en-only`, branch `feat/printings-ja-en-only`, base `1882fa4`.
No commit, push or deploy. `package.json`, lockfile, `tsconfig.json`, `.github/` and `docs/contracts.md` were not edited. `npm ci` was run in this worktree (no node_modules before).
All browser fixtures (camera, worker, alternatives, Scryfall, Frankfurter) are SYNTHETIC. Nothing here is evidence of real recognition accuracy, real alternative quality, live prices or iPhone Safari behavior; human device tests remain NOT RUN.

## Changed files

| File | Change |
|---|---|
| `src/ui/printings-list-model.ts` | `japaneseOrEnglish()` filter (`lang` is `ja` or `en`). |
| `src/ui/printings-list.ts` | `update()` filters its input; the empty message shows when no listed card differs from `currentId` (was `length <= 1`). |
| `public/recognition/scanner.worker.mjs` | `search()` tracks the best row per identity in the single existing loop and returns `alternatives` (≤4, best identity excluded, score order); `processFrame` result message carries `alternatives`. Header modification note updated. |
| `src/recognition/adapter.ts` | `RecognitionAlternative`, `normalizeAlternatives()`, `RecognitionResult.alternatives` (always an array). |
| `src/recognition/live-candidate.ts` | `adopt()`: installs a reader-chosen alternative as the newer pending suggestion. |
| `src/ui/alternative-candidates.ts` | Entries carry `identity`/`faceIndex`; dedupe by card id and by identity; stale TODO replaced by a description. |
| `src/main.ts` | `observeCandidate()` keeps the newest frame's alternatives for the live suggestion; `openAlternatives()` fetches and verifies them; `chooseAlternative()` swaps one in; TODOs removed. `verifiedCard()` is shared with `presentSuggestion`. |
| `tests/unit/{printings-list-model,adapter,alternative-candidates,live-candidate}.test.ts`, `tests/unit/worker-topn.test.mjs` | New unit tests. |
| `tests/browser/printings-lang-topn.spec.ts`, `tests/browser/detail-flow.ts` | New browser spec; helper gets `alternatives`/`cardRequests` options and a `delta` card. |

## Design decisions

- **Request 1.** The filter lives in `PrintingsList.update()`. `main.ts` is unchanged for it: its `printings` array stays unfiltered, so `japaneseDisplay`/`applyJapanese` still find a Japanese printing and the same-Oracle check in `showCard` is unaffected. A card the listing lacks is still re-added by `main.ts`, so a `de` current card is not listed (strict ja/en) and the list shows the other ja/en printings.
- **Request 2, worker.** `identityScores` became `Map<identity, {score,row}>`. The best identity's row equals the global best row (first maximum wins in both), so `best` is unchanged and `margin` is the same value as before. The 180° rotated search keeps the alternatives of whichever orientation wins (`chooseBetterMatch` returns the whole object). Alternatives are plain data, nothing is transferred.
- **Metadata fetch.** Lazy, on opening 他の候補, not per frame: no new network calls in the recognition loop. The current candidate renders immediately; each runner-up is fetched via its own `CandidateMetadata` cache (on `candidateRepo`, so the shared provider rate scheduler applies) and appears when Scryfall returns exactly that id with a real name (`verifiedCard`, the same rule as for the live candidate). Failures and unverifiable ids are omitted. A separate cache is used because `presentSuggestion` calls `snapshots.cancelExcept`, which would abort these requests when a newer live proposal arrives. Cost: up to 4 extra requests per list opening (~0.1s spacing each).
- **No score floor** for alternatives (the live candidate's cosine≥0.50 gate does not apply); the similarity is shown on each entry. If this is too noisy on real data, add a floor in `openAlternatives()`.
- **Choosing an alternative.** The old card is dismissed (`tentative.dismiss`) and the choice is installed with `adopt()`, so camera frames of the old card cannot swap it back; a different card or sustained absence re-arms. A queued newer proposal is dropped because the reader's choice wins. Choosing the current entry behaves as before.
- DFC: alternatives show the worker's `faceIndex` image only; face switching is unchanged.

## TDD evidence (commands run in this session)

Baseline: `npm run check` 24 files / 177 tests PASS (after `npm ci`).

1. Language filter. RED `npx vitest run tests/unit/printings-list-model.test.ts` → 3 failed. GREEN → 8 passed.
2. Worker top-N. RED `npx vitest run tests/unit/worker-topn.test.mjs` → 4 failed (`alternatives` undefined). GREEN with `worker-face.test.mjs` → 2 files / 5 tests passed.
3. Adapter, `alternativeCandidates`, `LiveCandidate.adopt`. RED `npx vitest run tests/unit` → 4 failed. GREEN → 23 files / 114 passed.
4. Browser. `MVP_PORT=4307 npx playwright test tests/browser/printings-lang-topn.spec.ts --project=desktop` before wiring `main.ts` → the top-N tests failed (list had 1 entry, others timed out); 5 passed. **Caveat:** the language-filter browser tests were run only after the filter was already implemented, so their RED is the unit RED above, not a browser RED. Two of my own tests were wrong initially (current card is re-added) and were corrected, not weakened.
5. After wiring: spec 20 passed (10 tests × desktop and mobile-viewport).

Final: `npm run check` 25 files / 188 tests PASS; `npm run build` PASS; `MVP_PORT=4307 npx playwright test` (port checked free with `lsof`) 320 passed, 0 failed.

## Known limits

- Real alternative quality is untested: the worker was exercised with synthetic float16 vectors only, never real model output or the real catalog.
- Opening the list costs up to 4 Scryfall requests; offline or rate limited, entries are simply missing (current candidate always remains).
- Alternatives come from the newest frame that proposed the shown candidate; a frame that fails the cosine gate does not refresh them.
- A history/search (static) view has no alternatives, as before.
- Alternative entries use one representative image and no printing choice; the printings list in the detail sheet covers that after choosing.
