# Intro hint, 他の候補, detail-sheet printings and history integration

Date: 2026-10-05. Implementation writer: Claude Sonnet 5.5 (`claude -p --model sonnet`), as assigned by AGENTS.md.
Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/intro-hint-alt-candidates`. Branch `feat/intro-hint-alt-candidates`. Base commit `45199a7`.
No commit, push or deployment was made. AGENTS.md, docs/contracts.md and docs/development-plan.md were read first. `package.json`, lockfile, `tsconfig.json`, `.github/` and `docs/contracts.md` were not edited (coordinator-owned).
All browser fixtures (camera, worker, Scryfall, Frankfurter, images) are SYNTHETIC. Nothing here is evidence of recognition accuracy, live prices or iPhone Safari behavior; human device tests remain NOT RUN.

## What changed (item → behavior)

| # | Behavior |
|---|---|
| 1 | `.start-hint` (SVG up-arrow + 「タップしてスタート！」) sits directly under the start button. `showIntro()` toggles it together with `.camera-intro`: visible only while the camera is stopped and no candidate is shown; hidden while scanning. |
| 2 | `概算 ¥…` is now `参考価格 ¥…`. `renderResult`'s price box no longer exists (see 11), so the only remaining producer is `renderCandidatePrice`, which feeds the dock and the detail sheet. |
| 3 | English name uses class `candidate-english` (1rem, regular, muted; no longer `.small`). The name (`strong.candidate-name`) was raised to 1.15rem/bold so the hierarchy is kept. |
| 4 | `日本語：` / `英語：` prefixes removed. Name shows the name only; `確認中…` and `日本語名は利用できません` have no label. |
| 5 | `viewDetails` and the now-empty dock toolbar were removed. `nameDetails` / `imageDetails` remain the only openers; `aria-controls`/`aria-haspopup`/`aria-expanded` now reference only those two and no dangling `aria-controls` remains (asserted). |
| 6 | `dismiss` is labeled 他の候補 and opens a new drawer route (「他の候補」) listing the candidates, ending with 見つからない場合は名前検索 (the old dismiss + search transition). See limits. |
| 7 | `manualVersion` button and `openManualVersion()` removed. |
| 8 | Detail DOM order is `tentativeRules`, `tentativeExpansion`, `tentativeMessage`, `tentativeSources`, printings. |
| 9 | `PrintingsList` (`src/ui/printings-list.ts`) at the bottom of the detail sheet: thumbnails of every printing of the shown Oracle id from `Repository.printings` (via the existing coalesced `japaneseSnapshots` cache). Tapping one calls `showCard()`, which updates `ReferenceImage`, `SetBadge`, `FormatLegality`, the price session, rules and names. The marker moves in place (`setCurrent`) so the tapped thumbnail keeps focus. |
| 10 | First 10 printings, then a `もっと見る` button reveals the rest (`visiblePrintings` in `printings-list-model.ts`). Exactly 10 or fewer shows no button. |
| 11 | `routes.result`, `result`, `renderResult`, `openCard`, `session`, `printingCards`, `currentCardButton`, `スキャンに戻る`, `次のカードをスキャン`, `choose()` and `currentHistoryGeneration` were removed. History rows and name-search results call `openStaticCard()` which opens the same detail sheet read-only. |

## Design decisions for 11 (history integration)

- One shared panel, two modes. Live mode keeps `suggestion`/`suggestionCard`. A history/search view sets `staticView=true`, has no suggestion, hides the save and 他の候補 buttons and the similarity score, and shows `スキャン履歴から表示 · 読み取り専用` / `名前検索から表示 · 読み取り専用`. Closing the sheet runs `hideSuggestion()`, so nothing is left in the dock.
- `shown = {card, finish}` is the single source for what the panel renders. History rows pass their stored `finish`; printing taps use the default (nonfoil, else first) finish.
- History rows now keep the recognized DFC `faceIndex` (small `ScanHistory.accept/update` addition, see provenance note) so reopening starts on the recognized face. The old result view did this through `confirmedFace`.
- Opening history or a search result stops the camera (unchanged policy) and never records a scan or restarts it.
- Browsing another printing in a history sheet is display only; history rows are never rewritten. `ScanHistory.update()` is now unused by `main.ts` but kept and still unit-tested.
- Live mode, tapping another printing then 履歴に保存 saves the **displayed** printing (that is how a correction is now made, replacing 版・言語・加工を変更). A save is tracked per (suggestion version, printing id), so saving two different printings of one scan is allowed and the label follows the displayed printing.
- While the 他の候補 list is open, a newer verified live candidate is queued exactly like the detail sheet does and is applied on close, so the list entry cannot be swapped underneath the reader.
- A hidden tab no longer closes a read-only sheet (only a live camera is stopped).
- Name-search results also open the sheet. This was not listed, but it was the only consumer of the removed route.

## Sequential TDD evidence

Commands were run in this session; console output was not written to log files.

Baseline before any edit (base `45199a7`): `npm run check` 22 files / 168 tests PASS; `npm run build` PASS; `MVP_PORT=4299 npx playwright test` 254 passed.

1. New pure models.
   - RED: `npx vitest run tests/unit/printings-list-model.test.ts tests/unit/alternative-candidates.test.ts` → 2 failed files, no tests (modules missing).
   - GREEN: same command → 2 files / 8 tests passed.
2. New browser behavior, written before the implementation (`tests/browser/intro-hint-alt-candidates.spec.ts` with `detail-flow.ts`).
   - RED: `MVP_PORT=4299 npx playwright test tests/browser/intro-hint-alt-candidates.spec.ts --project=desktop` → 22 of 22 failed (feature absent: no hint, `概算`, prefixes, `詳細を見る`, no 他の候補, no printings, `.result` route).
   - After implementing and `npx vite build` (the first GREEN attempt ran against a stale `dist`, then was rebuilt): 19 passed, 3 failed. Two failures were a test bug (it measured the file button that now lives in the hidden search drawer); one was a real bug (the name-search query was fixed when the list opened, before the Japanese name loaded). Test fixed and the query is now computed when searching.
   - Both projects: 44 passed.
3. Focus regression found in review.
   - RED: added "tapped thumbnail keeps focus" → 1 failed (`Received: inactive`; the list was rebuilt on every tap).
   - GREEN: same-Oracle taps now call `setCurrent` instead of rebuilding.
4. Hidden-tab regression found in review.
   - RED: "a hidden tab keeps the read-only sheet open but still stops a live camera" → 1 failed (sheet closed).
   - GREEN: `visibilitychange` ignores a static view. Spec now 46 passed (23 tests × desktop and mobile-viewport).
5. Existing specs were updated after the implementation to the new UI (their failures were the expected consequence of removed behavior; a full desktop run right after the implementation failed more than 80 tests (the listing was cut at 80 lines), all from the removed route, labels, `概算`, `別のカードを探す`, `詳細を見る`, `.result` and ambiguous `img`/`strong` selectors). Updated files: `live-candidate`, `smoke`, `scan-history`, `combined-camera-ui`, `camera-first-design`, `candidate-immersive`, `continuous-camera`, `dfc-metadata`, `format-legality`, `reference-image` specs and `immersive-routes.ts` (adds `searchFromCandidate`; `確定カード` route removed).
   - Tests deleted because the behavior no longer exists: `detail manual version flow…`, `reopening detail manual flow preserves the existing physical override` (live-candidate), and `late FX preserves focused rules disclosure and its open state` (combined-camera-ui; the rules `<details>` was a result-view control and the sheet shows rules unfolded).
   - Tests converted to the sheet: price/FX race, scroll/focus preservation, printing/language switching (now thumbnails), DFC face, reference image races, history reopen and 101-scan cap. No skips, no threshold relaxation.
   - Manual dismissal in the live tests now goes through `searchFromCandidate()` (他の候補 → 見つからない場合は名前検索), which preserves the dismiss/rearm semantics those tests cover.

## Final validation (after the last change)

- `npm run check`: PASS, TypeScript + 25 test files / 180 tests.
- `npm run build`: PASS.
- `MVP_PORT=4299 npm run test:e2e`: 294 passed (desktop + mobile-viewport, 1.5 min), port 4299 only.

## Known limits

- **Item 6 shows one candidate.** `scanner.worker.mjs` `search()` returns a single best match, so 他の候補 lists only the current confirmed candidate (similarity and 現在の候補 shown). `alternativeCandidates(current, others)` already dedupes and sorts by similarity and is unit-tested with extra entries, but nothing supplies `others`. TODO comments mark the work: top of `src/ui/alternative-candidates.ts`, and `openAlternatives()` / `chooseAlternative()` in `src/main.ts` ("when the worker returns top-N candidates … render several entries"; a non-current entry must be verified and swapped in as the live suggestion). Tapping the single entry only opens the detail sheet.
- Printings are listed in provider order (`order=released`), not same-language first, and the shown printing is not pinned to the first 10; with long lists it can sit behind もっと見る (it is still marked when revealed).
- A printings request now runs for every shown card (previously skipped for Japanese printings) because the list needs it. It goes through the existing 60 s coalescing cache, so there is no extra request per frame.
- `概算JPYは利用できません` (shown when FX is missing) was not part of the request and still says 概算. Decide whether it should read 参考 for consistency.
- Dock height still uses the old `--dock-height` constant although the toolbar row (about 42 px) is gone; the new larger name/English text uses some of that room. Checked by the existing 320/390/440 and short-viewport specs and by screenshots at 320 and 390 (a 1280 screenshot was taken but not inspected), but not tuned further.
- `docs/contracts.md` is not updated (coordinator-owned). Statements about manual physical overrides updating the confirmed event, the result route, and "approximate JPY" are now stale.
- Not verified: real cameras, real Scryfall data, iPhone Safari/Android Chrome, performance on devices. Printing thumbnails are public Scryfall reference images loaded lazily; no image upload was added.

## Provenance note: files I did not write

At about 09:32–09:33 (during my baseline run) these appeared in this worktree, written by a process that was not mine (only my `claude -p` process was running in this worktree):

- `src/ui/printing-list.ts`, `tests/unit/printing-list.test.ts` — a second, unused implementation of the printing list (same-language-first ordering, `もっと見る（残り N件）` label).
- `src/ui/scan-history-model.ts` and `tests/unit/scan-history.test.ts` — optional `faceIndex` retained by `ScanHistory.accept/update`.

I read them. I kept and used the `faceIndex` change (it is small, tested, and needed for 11). I left `printing-list.ts` and its test untouched and unused (my `printings-list.ts` is the implementation wired in; the label `もっと見る` is exact because the spec names that button). The coordinator should decide whether to delete the duplicate. `AGENTS.md` was already modified before I started and was not touched.
