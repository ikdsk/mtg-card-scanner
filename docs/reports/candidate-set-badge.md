# Candidate physical set badge — implementation evidence

Date: 2026-10-05 JST. Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/candidate-set-badge`.
Branch: `feat/candidate-set-badge`. Base/HEAD: `4d649e32938115fff6cfebb315d3aea595e55b9c`.
Changes are **uncommitted** as requested. No push/deploy. No other worktrees edited.

## Changed paths

- `src/ui/set-badge.ts`: new physical metadata label, remote image, trusted SVG URL validation, per-set cache/coalescing, revision guard.
- `src/main.ts`: import/instantiate badge, append to compact summary, clear on replacement/hide, update only inside the existing verified physical card callback.
- `src/ui/style.css`: append only `.candidate-set`, `.candidate-set img`, `.candidate-set span` rules. No toolbar/header changes.
- `tests/unit/set-badge.test.ts`: new URL and cache/identity tests.
- `tests/browser/set-badge.spec.ts`: new synthetic browser coverage and `testInfo.outputPath` screenshots.
- `docs/reports/candidate-set-badge.md`: this report.

No dependencies, configuration, shared contracts, or existing tests changed.

## Behavior and boundaries

The collapsed panel displays the verified physical card's `set_name` and uppercase `set` immediately. Japanese display fallback cards do not enter this component. The detailed edition/collector/language/finish line remains available on expansion.

Metadata comes from `https://api.scryfall.com/sets/{code}` through the existing JsonClient (shared provider scheduler, timeout and 429 handling). Independent request queues allow B's set request to finish while A remains delayed. Metadata must have `object: set` and the requested code. Safe icon URLs require HTTPS, exact `svgs.scryfall.io`, no credentials/nonstandard port, and `/sets/<name>.svg`. Only an `img` renders the remote SVG; no raw SVG/HTML insertion. The image is decorative (`alt=""`), and its group has the accessible label `実物の拡張：<physical name> (<CODE>)`.

A bounded 100-entry, 60-second tab-memory cache coalesces promises per set and caches failures. Repeated frames do not update the badge or refetch metadata. Returning A → B → A within the cache lifetime makes exactly two set metadata requests. Icon resource HTTP caching remains browser-managed. Old metadata can finish for cache reuse, but a badge revision check prevents it from mutating a replacement or cleared candidate. Missing/unsafe metadata, network errors, and image load errors retain readable physical text. Confirmation/recognition never await set metadata.

## Actual official sample (not a mocked fixture)

Command: `curl -fsSL https://api.scryfall.com/sets/lea` — exit 0.
Relevant returned values:

```json
{"object":"set","code":"lea","name":"Limited Edition Alpha","icon_svg_uri":"https://svgs.scryfall.io/sets/lea.svg?1790568000"}
```

Command: `curl -fsSI 'https://svgs.scryfall.io/sets/lea.svg?1790568000'` — exit 0; HTTP/2 200, `content-type: image/svg+xml`, `content-length: 3424`.
Sources: [official set endpoint](https://api.scryfall.com/sets/lea), [official icon](https://svgs.scryfall.io/sets/lea.svg?1790568000).
The web browsing tool could not access Scryfall (API inaccessible/docs 403); the actual sample above was fetched with curl. It proves the endpoint sample, not live end-to-end UI behavior.

## RED → GREEN evidence (real commands and outcomes)

1. `npm ci`: exit 0; 87 packages installed, 0 vulnerabilities.
2. `npx vitest run tests/unit/set-badge.test.ts`: RED exit 1, missing `src/ui/set-badge.js`. Added the URL guard; same command GREEN, 1 test passed.
3. Added per-set coalescing/cache/failure/identity behavior test; same command RED exit 1, `SetIcons is not a constructor`. Implemented cache; GREEN, 2 tests passed.
4. `npm run build`: exit 0 on base plus initial helper.
5. `MVP_PORT=4279 npx playwright test tests/browser/set-badge.spec.ts --project=desktop`: initial fixture failure because the canvas had no delivered painted frame; corrected the synthetic fixture by painting it. Rerun: intended RED, 2 failures at `.candidate-summary .candidate-set`, element not found (320/390).
6. Implemented badge/compact wiring/scoped CSS. `npm run build` exit 0, then same browser command GREEN, 2 passed (4.2s). This includes Japanese fallback separation, accessible label, compact bounds, and A → B → A metadata request count.
7. Added delayed A / B browser behavior. `MVP_PORT=4279 npx playwright test tests/browser/set-badge.spec.ts --project=desktop -g 'late A'`: RED, expected one B icon, received two icons after A resolved. Added revision guard; rebuilt and reran: GREEN, 1 passed (3.0s).
8. Added supplemental missing/network/image/unsafe fallback tests after the initial badge implementation. Initial image failure test exposed a fixture route override (the setup's later SVG route superseded the failure route); corrected the setup and asserted that the failing image request actually occurs. No production assertions weakened.
9. First combined relevant run: 82 passed / 6 failed. Two large-text failures reproduced price clipping introduced by the badge; reduced only badge margin/line-height/icon dimensions. Two image fixture failures corrected as above. Two existing fixed-request-count failures remain below.

## Final verification

- `npm run check`: exit 0; TypeScript passed; **22 test files / 165 tests passed** (2.05s).
- `npm run build`: exit 0; CSS 16.56 kB (gzip 4.12 kB), initial JS 54.35 kB (gzip 19.50 kB). Earlier baseline build was JS 52.74 kB (gzip 19.05 kB), CSS 16.33 kB (gzip 4.07 kB). No asset pack or dependency added.
- `MVP_PORT=4279 npx playwright test tests/browser/set-badge.spec.ts tests/browser/candidate-immersive.spec.ts tests/browser/live-candidate.spec.ts`: **86 passed / 2 failed**, exit 1, 34.1s. Both failures are the existing request-total expectation described below. Candidate immersive coverage (including 24px root text / short viewport) passed in both projects. New badge coverage passed in both projects.
- Final strengthened new test command: `MVP_PORT=4279 npx playwright test tests/browser/set-badge.spec.ts --output=test-results/set-badge-final` (includes real accessible-group lookup, decoded icon naturalWidth, and correctly matching B metadata). **14 passed**, exit 0, 12.8s.
- `git diff --check`: exit 0.

## Remaining integration test update

Severity: test integration blocker (no observed product malfunction).
File/line: `tests/browser/live-candidate.spec.ts:114` (existing TEST-owned file, untouched).
Reproduction: relevant combined command above, either desktop or mobile-viewport project.
Expected by old test: exactly 3 total provider requests. Actual: 4, because the feature adds one `/sets/tst` request. The exact-card request assertion (`requests === 1`) still passes; new badge tests prove one metadata request per set across repeated observations/return visits.
Recommendation: independent TEST/coordinator should explicitly assert the existing 3 card/JP/FX calls plus exactly one set metadata call, including no additional calls on repeated frames. Do not simply relax the count threshold. This implementer did not edit or skip the existing test.

## Evidence artifacts and limits

Screenshots are generated through `testInfo.outputPath`:

- `test-results/set-badge-final/set-badge-compact-physical-9d75d-adable-label-320-SYNTHETIC--desktop/compact-320.png`
- `test-results/set-badge-final/set-badge-compact-physical-02d99-adable-label-390-SYNTHETIC--desktop/compact-390.png`
- Corresponding `--mobile-viewport` paths, plus `missing-fallback.png`, `network-fallback.png`, `image-fallback.png`, and `unsafe-fallback.png` under their individual test directories.
- The full relevant run's two failed existing tests retain screenshots/error-context/trace in `test-results/live-candidate-320px-propo-69d06-ork-is-coalesced-SYNTHETIC--{desktop,mobile-viewport}/`.

All browser camera pixels, worker results, cards, Japanese metadata, price/FX and rendered SVG icons are **SYNTHETIC fixtures**, explicitly labelled in tests. Chromium desktop/mobile viewport emulation is not real mobile hardware. Human device tests, real recognition accuracy, mobile latency, independent TEST/QA, and separate-worktree combined-candidate verification at a pinned integration commit are **NOT RUN**. The official API/icon sample above is the only live-provider evidence.
