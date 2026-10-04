# Issue #16 — result reference image implementation candidate

Date: 2026-10-04 (JST). Issue: https://github.com/ikdsk/mtg-card-scanner/issues/16

Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/result-card-image`.
Branch: `feat/result-card-image`. Base / unchanged HEAD: `74202bb6dfe91e2dc8d3da9467ace0e196da348d`.
No commit created. Entire candidate is unstaged, including new untracked source/tests/report. No push, merge, deploy, Tailscale change, dependency/configuration change, or contracts edit.

## Behavior and changed paths

- `src/data/cards.ts`: optional full-card image URI fields on existing card/face type. Existing JSON validation/cache already preserves optional fields; image URLs are independently validated at use. Invalid/missing optional imagery cannot reject otherwise valid metadata/prices.
- `src/ui/reference-image.ts`: persistent reference-image DOM, label 参照画像, selected physical card/printing/language image, card-name/face alt, Scryfall attribution and link. Normal/grid/large/display/png full-card formats only. DFC face buttons use native keyboard behavior and aria-pressed. Card identity/language changes reset to front; finish/price/FX updates retain face and image DOM. Epoch checks reject obsolete image load/error events. Missing/error messages retain the reserved image region.
- `src/main.ts`: attach component near result name, clear component on session reset, invalidate old result when recognized-ID lookup starts, describe reference-image network access in privacy details. Japanese display-text fallback is never passed to the image component. Existing result scroll/reveal and focus restoration remain in place.
- `src/ui/style.css`: responsive image region, reserved 488:680 aspect ratio, object-fit:contain; max width 300px desktop / 260px mobile. Full image remains visible without stretching/cropping/filtering/overlays. No camera geometry changes.
- `tests/unit/reference-image.test.ts`: four synthetic unit/adversarial tests.
- `tests/browser/reference-image.spec.ts`: six synthetic browser scenarios, each run in desktop and mobile-viewport projects (12 added browser cases).
- `docs/reports/result-card-image.md`: this handoff.

No model, catalog, threshold, capture, package, lockfile, shared contract, other worktree or existing tests changed. No assets added to git.

## Actual RED → GREEN evidence

Commands ran from this worktree with Node v24.2.0; browser Chromium 147.0.7727.15. No skips, threshold relaxation or existing assertion weakening.

1. `npm ci`: exit 0, 87 packages added, 0 audit vulnerabilities.
2. `npx vitest run tests/unit/reference-image.test.ts`: RED exit 1; missing new module, one failed suite / 0 collected tests. Added selected-image resolver and URL validation. Same command GREEN exit 0: 1 test / 1 file passed.
3. `npm run build && MVP_PORT=4207 npx playwright test tests/browser/reference-image.spec.ts --project=mobile-viewport`: build passed, behavioral RED exit 1: 1 browser case failed because `.reference-image img` did not exist. Attached persistent image component to result UI and added reserved styles. Same command GREEN exit 0: 1 browser case passed.
4. `npx vitest run tests/unit/reference-image.test.ts`: RED exit 1: 1 failed / 1 passed, empty face array resolved to [] instead of explicit unavailable-image entry. Added empty-face fallback. Same command GREEN exit 0: 2 passed.
5. `npm run build && MVP_PORT=4207 npx playwright test tests/browser/reference-image.spec.ts`: GREEN exit 0: 6 cases passed, covering exact printing/language, DFC/absent/error, delayed imagery/stale events/layout/focus/scroll.
6. `npx vitest run tests/unit/reference-image.test.ts`: RED exit 1: 1 failed / 2 passed for current grid format returning null. Added grid/display full-card fallbacks and factored common resolver. Same command GREEN exit 0: 3 passed.
7. Supplementary browser race fixture initially failed: `npm run check && npm run build && MVP_PORT=4207 npm run test:e2e` yielded check 137 passed, build passed, browser 28 passed / 2 failed. The fixture waited for a printing list queued behind its deliberately pending card request. Subsequent focused run had 6 passed / 2 timeout failures because the repeated identical search used the existing cache. Corrected fixture to initiate manual correction with a different query, retaining the printing-list and image assertions. No production scheduler/cache changes. `MVP_PORT=4207 npx playwright test tests/browser/reference-image.spec.ts --grep 'reversed'`: 2 passed.
8. Added supplemental recognition-path, late FX face/DOM/focus/scroll, and uncooperative-provider response-order coverage. `npm run check && npm run build && MVP_PORT=4207 npm run test:e2e`: exit 0; **139 unit/regression tests in 12 files passed; build passed; 34 browser cases passed**. Build JS 29.85kB / gzip 11.84kB, CSS 5.11kB / gzip 1.86kB; no image assets in bundle.
9. Made screenshot output portable via Playwright outputPath (local copy outside git); `MVP_PORT=4207 npm run test:e2e`: exit 0: **34 passed (9.9s)**.
10. `git diff --check`: passed.

Browser scenarios use explicitly SYNTHETIC provider cards, an SVG image served by routes, synthetic recognition worker output and a 2×2 generated frame. They establish UI behavior, not recognition accuracy, actual provider availability or mobile performance. The unit response-order test uses a provider that ignores AbortSignal and resolves the previous image/card last; the browser test separately exercises real request abort plus delayed route completion and obsolete DOM load/error events.

## Security and privacy

Only absolute HTTPS URLs on exact `cards.scryfall.io` image host and `scryfall.com` link host are accepted. Reject alternate protocols, deceptive host suffixes, credentials and nonstandard ports. Missing/invalid link becomes an encoded Scryfall ID search URL, never arbitrary remote navigation. All remote names/captions use DOM textContent/text nodes, never innerHTML. Links use noopener/noreferrer; images use no-referrer. No image proxy, API image redirect, private input URL, upload, persistence, analytics or new recognition request. Browser caching of public reference images follows the image provider's HTTP headers; application code adds no asset storage.

Camera/file processing is unchanged. No credentials or private photographs read. Tests generate their own synthetic frame in the browser. No messages to third parties or paid actions.

## Verified primary sources and public data

Official sources fetched directly with curl on 2026-10-04 (web tool returned 403, direct HTTP fetch succeeded):

- [Scryfall API — Use of Scryfall Data and Images](https://scryfall.com/docs/api). Supports Magic software/research/community use under WotC Fan Content Policy; prohibits implied endorsement, paywalling, new-game misrepresentation, and mere repackaging/proxying. Image rules require retaining artist/copyright, preserving geometry/colors/sharpness, avoiding custom marks, and identifying source/artist. Implementation uses unaltered full-card images, containment, attribution/link and existing rights notice. No art crops, filters, watermarks or overlays. This source review is not public-release approval.
- [Scryfall Card Imagery](https://scryfall.com/docs/api/images). Documents image_uris full-card formats, normal 488×680, plus grid/display replacements and absent/placeholder image states. The reserved region uses normal geometry while containment preserves native geometry for other formats.
- Public data request: `curl -L --fail --max-time 25 'https://api.scryfall.com/cards/named?exact=Lightning%20Bolt' -o /tmp/result-card-image-public.json`. Real response: Lightning Bolt, ID `7673784e-db4b-43a1-8d55-1bb9fc1e284f`, MSC #806, en; full-card normal/grid/large/display/png URLs on cards.scryfall.io and [its public Scryfall card link](https://scryfall.com/card/msc/806/lightning-bolt). This verifies real public field shapes, not live recognition or browser image rendering.

Exact fetched HTML and public JSON preserved outside git:
`/Users/dikeda/workspace/mtg-card-scanner-research/result-card-image/scryfall-api-2026-10-04.html`, `scryfall-images-2026-10-04.html`, `public-lightning-bolt-2026-10-04.json`.

## Visual evidence and limits

Locally opened and inspected actual Chromium screenshot from built-app mobile viewport (390×844, touch/mobile emulation):
`/Users/dikeda/workspace/mtg-card-scanner-research/result-card-image/synthetic-mobile.png`.
Result name, 260px-wide full-aspect reference, front/back controls and attribution fit the viewport; no horizontal clipping. Image is explicitly marked SYNTHETIC in its pixels. Screenshot is outside git; tests use portable ignored Playwright artifacts.

Human iPhone Safari/PWA and Android Chrome device tests: **NOT RUN**. Live camera recognition, real-photo identification, live public image render, cold-start/scan latency and mobile-network performance: **NOT RUN**. No fabricated price, recognition or performance evidence. Full-frame camera regression and existing result reveal/focus/scroll browser tests passed with their existing synthetic fixtures.

## Handoff

Candidate only. Independent QA/review, combined pinned-commit validation, GitHub CI, integration and release/deployment remain coordinator-owned. No known failing final implementation checks; device/provider/runtime limitations above remain. Playwright manages and stops only this task's temporary preview server on 4207; servers 4195 and 4189 were not touched. Coordinator should inspect optional data-type extension and image-host policy, then run independent QA against the complete candidate.
