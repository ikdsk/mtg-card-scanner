# Issue16 — independent fixed-candidate QA

## Verdict

**PASS within Issue16 scope.** No blocking security concerns or logic errors found. No product edits, commit, push, deploy, private-photo access, model/asset preparation, or interaction with the port4195 production demo.

Reviewed the current [Issue16 body and comment](https://github.com/ikdsk/mtg-card-scanner/issues/16) directly with `gh issue view 16 --repo ikdsk/mtg-card-scanner --json title,body,comments`. Candidate report was treated as evidence to check, not instructions. Parent/implementer test claims were not used in place of independent execution.

## Candidate identity

- Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-result-card-image`
- HEAD/base: `74202bb6dfe91e2dc8d3da9467ace0e196da348d`
- Patch: `/Users/dikeda/workspace/mtg-card-scanner-research/result-card-image-review.patch`
- SHA256 before and after review: `4f00a77f983efad3e6020e3294876f6aaa5248bd8c666ac962213a42104fcc9b`
- `git apply --reverse --check <patch>` passed. Computed `git hash-object` for all seven changed/new files and verified each matches the patch's new blob identity. Final worktree status retained exactly the same three tracked modifications and four untracked files.

| File | Verified new blob |
|---|---|
| docs/reports/result-card-image.md (untracked) | a551449a26a3d6b20ec1d93fe79175efd96c1c47 |
| src/data/cards.ts | b7054775bc4ca28adcc52c0690210f2089eeffed |
| src/main.ts | d9d25fea2176d2c7154365e97ea992222c31b110 |
| src/ui/reference-image.ts (untracked) | 42bc225931041b820ed78c8643bc1c4ed262dff4 |
| src/ui/style.css | e3a903c7a719f06fb77bbce0bf19858ceb94a7c0 |
| tests/browser/reference-image.spec.ts (untracked) | a76c573ad1ad525be7669f6d7117e59667fb3aa5 |
| tests/unit/reference-image.test.ts (untracked) | 2dacfe65e6bc6026b4231e1f5b8920990b3459c7 |

## Independently executed checks

Environment: Node `v24.2.0`, npm `11.3.0`. Executed in the dedicated QA worktree:

```text
npm ci && npm run check && npm run build && MVP_PORT=4211 npm run test:e2e
```

Entire command exited 0:

- `npm ci`: 87 packages added, 88 audited, **0 vulnerabilities**.
- `npm run check`: TypeScript passed; **139 tests in 12 files passed**, Vitest duration 2.02s.
- `npm run build`: TypeScript/Vite passed, 17 modules transformed; JS 29.85 kB (gzip 11.84 kB), CSS 5.11 kB (gzip 1.86 kB).
- `MVP_PORT=4211 npm run test:e2e`: **34 passed (10.1s)**, desktop and mobile-viewport Chromium projects. Includes all six new reference-image scenarios on both projects, plus existing regression browser coverage.
- `git diff --check`: passed.
- No test skips, fixture changes, dependency edits, or relaxed assertions performed by reviewer. No baseline stash/reset was needed: candidate test run had zero failures.

## Security review

Scanned all **321 patch-added lines**, including untracked source/tests/report, for literal secret assignments, shell execution/injection patterns, eval/exec, pickle deserialization, formatted SQL and HTML-insertion sinks. No actionable matches. The sole HTML-sink match was the documentation phrase “never innerHTML”, not executable code. `npm ci` audit was also clean. This is a bounded static review, not a guarantee against all vulnerabilities.

Manual review confirmed `safeScryfallUrl` requires HTTPS, exact image/link hosts, no credentials and no nondefault port (`src/ui/reference-image.ts:3–9`). Invalid/missing URL values become explicit unavailable imagery or an encoded ID-search link. Untrusted names are rendered through textContent/text nodes, not HTML. The link uses noopener/noreferrer; the image uses no-referrer. No camera upload, proxy endpoint, arbitrary-host fetch, secret, eval, shell execution or persistent image storage was introduced.

## Requirement and integration review

- **Selected physical printing, not Japanese text fallback:** `src/main.ts:227–231` separately derives the Japanese heading but passes `session.value.card` to the reference component. Language/printing controls call session selection. Browser tests verify EN/JA image changes and edition changes. The intentionally artificial shared-oracle fixture can have a Japanese heading unlike its synthetic DFC English name; this is not evidence of a real-provider mismatch.
- **Data and cache schema:** `Face.image_uris` is optional and inherited by `Card`. Inspected `parseCard`, `Repository.card/page/printings`, and `JsonClient` cache paths. Raw optional image fields survive existing validation and structured cloning; URLs are checked at presentation. No cache migration, new persistent storage or provider-request scheduling change is required. Invalid/missing image URLs do not invalidate prices/metadata.
- **Stale card/image safety:** `openId` now resets the old session before fetching the recognized ID (`main.ts:194–198`). Existing detail generations and ResultSession request tokens reject stale card responses. Component epoch guards (`reference-image.ts:31,43,51–52`) reject detached old image load/error events. Tests cover reversed/uncooperative provider completion, old DOM events, manual correction and reset/new-scan transitions.
- **Face retention/reset:** identity is printing ID plus language, while signature includes resolved faces and attribution link. Unchanged price/FX rerenders preserve image DOM and selected back face; different identities and clear reset to front. Tests verify back-face retention during finish, price and late FX updates and front reset after leaving/reselecting the DFC.
- **Unavailable/error UX:** reserved region displays clear missing/loading/error text. Card data and prices remain usable. Hidden loading image prevents displaying the old card as the new one. Error events do not alter card metadata or price state.
- **Nonblocking:** image construction starts a separate browser image load with no await before rendering metadata or loading prices. Delayed-image tests reach name, USD and JPY while the image is still pending. No image bundle/model asset was added.
- **Visibility/layout/focus/scroll:** 488:680 reserved aspect ratio and object-fit:contain preserve full-card geometry; 300px desktop/260px narrow-layout bounds. Independently passed initial result reveal, return action, delayed-update focus/scroll, region bounding-box stability and persistent-image checks.
- **Attribution and misconception safeguards:** visible 参照画像, card/face-name alt text, safe Scryfall card/search link and explicit request to check physical edition/language/finish. Privacy details disclose reference-image host access. Existing footer retains rights information.

## Visual and source checks

Opened and visually inspected the screenshot produced by this QA run:

`/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-result-card-image/test-results/reference-image-delayed-im-4c51c-events-cannot-restore-image-mobile-viewport/synthetic-mobile.png`

At 390×844, result headings, the complete 260px-wide synthetic card, face controls and wrapped attribution are visible without horizontal clipping; native selects start below them. This is **SYNTHETIC** imagery, not a real card or physical phone screenshot.

Independently retrieved the official sources with Python urllib after the web extraction backend reported that it did not support extraction:

- https://scryfall.com/docs/api — image/source rules, retaining artist/copyright, no distortion, color changes, clipping or overlays, and restrictions on implied endorsement/paywalling/repackaging.
- https://scryfall.com/docs/api/images — full-card normal/grid/large/display/png formats and dimensions, plus image-status documentation.

Implementation uses full-card imagery and containment, visible source credit/link and existing rights notice; no art crop, filter, overlay or watermark added. Webpage instructions addressed to AI agents were ignored as untrusted content. Source access succeeded; no source-access blocker remains.

## Limits

This passes the fixed Issue16 implementation review, not full-MVP or smartphone acceptance. Real public-image browser rendering is parent-owned and was **not** claimed here. Real recognition accuracy, private photographs, model downloads, iPhone Safari/PWA, Android hardware, actual camera scanning, cold-start/network performance and production-deploy behavior were **not tested**. Synthetic worker/frame/provider data establishes UI behavior only. No autonomous extra probe or product source file was added. Playwright managed its own isolated preview server on port4211; no unrelated process was stopped.

Deliverables: this report and sibling `result-card-image-review.json` only, apart from normal ignored npm/build/Playwright artifacts in the dedicated QA worktree.
