# Session scan history candidate — 2026-10-04

Branch: `feat/scan-history`. Base/HEAD: `eb321dcbdf7a26f2302de1e2e1355dae93953584`.
No candidate commit: intentionally unstaged for coordinator integration and independent combined QA. No push/deploy. Work performed only in `/Users/dikeda/workspace/mtg-card-scanner-worktrees/scan-history`.

## Owned changes

- `src/ui/scan-history-model.ts`: bounded, defensively copied tab-memory model.
- `src/ui/scan-history.ts`: reusable semantic section and compact accessible button rows; keyed DOM preserves unchanged images/focus.
- `src/ui/scan-history.css`: scoped monochrome responsive rows, no nested scroll.
- `src/main.ts`: minimal lifecycle wiring, original history printing/finish reopen, manual override update, preserve finish on printing-list retry.
- `tests/unit/scan-history.test.ts`: model coverage.
- `tests/browser/scan-history.spec.ts`: explicitly SYNTHETIC browser scenarios.
- This report.

No dependencies, shared contracts, config, recognition gate/model or main price formatting changed. Existing tests unchanged.

## Lifecycle and data choice

An event is accepted only after the stability gate returns a card ID and `openId` receives schema/identity-validated repository metadata while its detail generation is current. The scan's camera/file generation is captured before camera stopping increments it. That monotonic event key is independent of ResultSession resets/revisions and camera stop generations. One accepted event per key; price/FX/printing-list renders never call history acceptance. Next scan/search clear only the current history association and the transient result, never the collection. Failed scan/provider card requests create no event. Deliberate later rescanning can add the same printing again.

Manual printing/language/finish choices replace the associated snapshot without changing ordering/count. Reopening restores the saved exact printing card and finish, stops any running camera/file generation, aborts prior detail work, and uses the existing ResultSession identity/token checks and repository cache/fetch protections. Reopening does not recognize a new image or create a history event. Later manual edits after reopening update that original event. Printing-list retry now explicitly retains the current finish.

The 100-entry bound limits retained public Card metadata and DOM. There is no localStorage/IndexedDB history or reload persistence. Public card metadata (including original provider fields) is retained, but rows intentionally show no quote or FX. Current result refresh uses existing repository caching policy (24h cache), not a promised uncached/live fetch. No camera pixels, input files, embeddings or user file names enter history.

Rows use existing public Scryfall URLs: validated `small` image or the same validated full-card fallback as ReferenceImage. No crop/art extraction. Native `loading=lazy`, async decoding and reserved 48×67 dimensions; browser lazy loading may prefetch near the viewport and is not an absolute no-request boundary. Missing/failed images retain a concise placeholder. No additional card/image API lookup for history rendering. Heading: スキャン履歴; oldest evicted, newest first; section hidden until first event. Memory/bound notice is visible and unobtrusive. The section follows the entire current result/actions and remains in normal document flow even when that result is transiently hidden.

## Actual RED/GREEN commands and outcomes

1. `npm ci`: PASS, 87 packages added, audit 0 vulnerabilities.
2. `npx vitest run tests/unit/scan-history.test.ts`: RED, missing `scan-history-model.js` (first event/duplicate/rescan test). Minimal model added; same command GREEN, 1 test.
3. Added override/snapshot-isolation behavior; same command RED, `h.update is not a function`. Added immutable update; same command GREEN, 2 tests.
4. Added bounded eviction, late evicted-generation rejection and invalid-limit regression assertions; same command GREEN, 3 tests. These assertions exercised already implemented behavior; they were not a separate RED cycle.
5. Browser RED against original base `main.ts`: temporarily saved candidate to `/tmp/scan-history-main-candidate.ts`, used `git show HEAD:src/main.ts > src/main.ts` (no checkout/reset/stash), ran `npm run build`, then `MVP_PORT=4219 npm run test:e2e -- tests/browser/scan-history.spec.ts --project=mobile-viewport`. 2 failed with expected 1 history row / actual 0; manual-search exclusion passed. Restored candidate immediately.
6. Candidate `npm run build` and `MVP_PORT=4219 npm run test:e2e -- tests/browser/scan-history.spec.ts`: GREEN, initial 6 project cases passed.
7. `MVP_PORT=4219 npm run test:e2e`: intermediate 40/40 passed.
8. Added camera-running and successful-thumbnail cases. Intermediate full E2E: 42 passed, 2 failed because SYNTHETIC fixture attempted to redefine its nonconfigurable `navigator.mediaDevices`. Fixed the fixture by assigning its `getUserMedia` method, preserving all assertions. One concurrently attempted targeted launch exited because 4219 was still owned by the first Playwright run; no unrelated server killed/reused.
9. Added 101-event bound scenario; targeted history E2E GREEN, 12/12 across desktop and mobile viewport. Extended camera scenario to accept a new camera scan after historical reopen, verify newest row and automatic result reveal.

Final commands/outcomes are recorded below after completion.

## Browser scenario coverage

Synthetic local 2×2 PNG input, synthetic Worker candidate/ready replies, fake canvas camera stream, provider fixtures and image responses only. These do not prove actual recognition, real provider behavior, camera permission/device behavior or mobile performance.

- Two repeat file frames record once; price/FX/printing rerenders and refresh record no extra event.
- Next-scan reset retains history even when camera permission fails.
- Different cards and later deliberate same-card rescan produce newest-first events.
- Edition/language/finish override updates original event, including an older reopened event.
- Reopen restores original printing/language/finish, reveals result, adds no event and never automatically starts camera.
- Delayed old scan metadata after history reopen cannot corrupt result/history; existing session/reference-image tests retain stale price/FX/detail coverage.
- History reachable while synthetic camera runs; reopen ends tracks; explicit later camera start yields exactly one new accepted event and reveals result.
- 101 deliberate scans retain newest 100, evict first different printing.
- Keyboard Enter opens row; valid public thumbnail URL loads with lazy attribute; absent/error image remains usable; no horizontal overflow/nested history scroll.
- Manual name-search selections excluded; reload removes history.

## Visual evidence and limitations

Chromium mobile viewport 390×844, synthetic data: screenshots saved outside git at `/Users/dikeda/workspace/research/scan-history/mobile-history.png` and `mobile-full-page.png`. Inspected browser-generated screenshot: heading/notice/three compact rows below actions, readable selection metadata, missing-image placeholder and no overflow. Scoped history heading/text colors and placeholder wrapping were corrected after inspection, and screenshot inspected again. Full-page screenshot also retained for combined QA.

Parent/base UI still has its original green buttons/marketing copy: those are exclusively the parallel B design owner's responsibility; the history component itself is black/white/gray. No real device run: **NOT RUN**. Real camera recognition, live provider/image evidence and combined B/formatJPY QA: **NOT RUN**. No public deploy, private input, credentials or production 4195 access.

## Coordinator integration

Copy/review the three isolated history modules, two new tests and report. Manually merge only the lifecycle/import hunks in `main.ts` onto B/formatJPY, preserving their shell and price implementation:

1. Import model/view, instantiate once, append `historyView.node` immediately after current result and its actions and before footer (adjust B's shell append call only).
2. Capture the camera/file generation at stable recognition; pass it to `openId`. Accept history after guarded metadata fetch, before opening current result.
3. Clear `currentHistoryGeneration` on explicit new camera/file scan, search and manual-search result selection; do not clear `history` on session reset/next scan/stop.
4. Update matching event only in manual `choose`; do not record from `renderResult`, ResultSession callbacks or price/FX refresh.
5. History reopen sets association, calls `openCard` with original saved card/finish. Preserve selected finish during printing-list retry. Keep existing stop/abort/detail/session protections and result reveal.
6. Keep standalone scoped CSS import. No changes to shared price rendering or B camera styles needed.

Independent TEST/QA must run the complete combined candidate in a separate pinned worktree. If B renames UI action labels, adapt these new test locators through coordinator review; do not weaken lifecycle assertions. No known implementation blocker on this isolated candidate; combined verification and human-device tests remain gates.

## Final verification

- `npm run check`: PASS, TypeScript plus 13 files / 142 unit and regression tests.
- `npm run build`: PASS, 20 modules; JS 32.34 kB (gzip 12.68 kB), CSS 5.95 kB (gzip 2.07 kB). Initial shell remains small; these build sizes are not device latency measurements.
- `MVP_PORT=4219 npm run test:e2e`: PASS, **46/46** cases, 21.2s; desktop and mobile-viewport Chromium. Includes 12 history project cases and all 34 existing cases, unchanged.
- `git diff --check`: PASS.
- `git diff --cached --stat`: empty; candidate is unstaged.
- `lsof -nP -iTCP:4219 -sTCP:LISTEN` after completed final run: no listener. Own test processes stopped by Playwright cleanup; no persistent server left.
- Branch/HEAD unchanged; no commit, push or deploy. Exactly the seven owned paths listed above are changed/untracked.
