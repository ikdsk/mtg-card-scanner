# Format legality icons and JPY-primary reference price

Branch: `feat/format-legality-icons`. Base/HEAD: `eb321dcbdf7a26f2302de1e2e1355dae93953584`. Supplemental implementation candidate is entirely unstaged; no commit, push, deployment or changes in the parallel camera-first-design worktree.

## Changes

- `src/ui/format-legality.ts`: reusable persistent `FormatLegality` component and pure `formatStatuses`. Current selected card's actual Scryfall `legalities` values only, never edition-based inference. Fixed paper order: Standard, Pioneer, Modern, Legacy, Vintage, Commander, Pauper. Compact monochrome app-made letter badges, explicitly explained as not official marks on disclosure. Legal is normal, banned/not_legal grey, restricted available with superscript limitation mark and one-card explanation, absent/unrecognized values dashed with question mark and unknown label. Native buttons provide tap, Enter and Space disclosure and accessible name/status/expanded state. New card identity clears old disclosure/status; unchanged price/FX renders preserve controls and disclosure.
- `src/main.ts`: minimal component wiring immediately under card heading/name, replaces old text legality enumeration. JPY is now the prominent primary `strong.price.yen` amount (`概算 ￥…`); USD is the smaller following `.usd` span (`$… USD`). Missing FX explicitly says `概算JPYは利用できません`, retains USD, and creates no numeric yen. Null and zero remain distinct. Existing source/date/cache/error/manual-target semantics remain in place. Existing persistent reference-image/DFC and focus-restoration mechanisms remain in place.
- `src/ui/style.css`: appended scoped neutral badge styles with wrapping and dark mode; JPY/secondary USD typography. Existing shell theme belongs to the parallel layout work, so the base shell still has its original green styling; this component introduces no green theme.
- `tests/unit/format-legality.test.ts`: synthetic legality classification/order/missing-value assertions.
- `tests/browser/format-legality.spec.ts`: synthetic provider tests for all statuses, tap/keyboard, rapid printing switches, disclosure reset, wrapping, JPY ordering/size/zero, late FX focus/disclosure/input/scroll and null prices.
- `tests/browser/smoke.spec.ts`, `tests/browser/reference-image.spec.ts`: equivalent USD assertions moved from old primary `.price` to secondary `.usd`, including the explicit `USD` suffix. Existing exact prices/targets/null/zero/scroll/focus/DFC assertions retained; FX error additionally requires explicit unavailable JPY. No skip/threshold/assertion weakening.

No type/dependency/shared-contract changes: existing Card already carries legalities. No recognition/model/threshold/camera changes. No credentials, private images, publication, Tailscale or production port 4195 modifications.

## Behavioral RED/GREEN evidence

Actual commands, executed in this worktree:

1. `npm ci`: exit 0, 87 packages installed, zero audit vulnerabilities.
2. `npx vitest run tests/unit/format-legality.test.ts`: RED exit 1, missing component import before implementation. After status implementation, GREEN exit 0, 1 test passed.
3. `npm run build`; `MVP_PORT=4217 npx playwright test tests/browser/format-legality.spec.ts --project=desktop`: RED exit 1, seven badge controls expected but zero existed. After component wiring/styles, build exit 0 and both desktop/mobile tests GREEN (2 passed).
4. `MVP_PORT=4217 npx playwright test tests/browser/format-legality.spec.ts --project=desktop --grep 'JPY is primary'`: RED exit 1, expected `概算 ￥0`, actual `$0.00`. After JPY-first markup/typography, build exit 0 and GREEN 1 passed.
5. `npm run check`: exit 0, TypeScript and 140 tests in 13 unit/regression files passed.
6. `npm run build`: exit 0. CSS 6.29 kB (2.17 gzip), JS 31.81 kB (12.58 gzip); measurements of bundle output, not device performance.
7. `MVP_PORT=4217 npm run test:e2e`: initial full run exit 0, 38 passed. Final run after preservation/null checks: exit 0, 42 passed (12.1s), desktop and mobile viewport.

Provider/card/FX/images/worker fixtures are explicitly SYNTHETIC. Tests prove UI behavior with controlled responses, not live provider observations, actual recognition or phone performance.

## Exact coordinator integration surface

The exact main.ts-only unified diff from base is saved outside git at `/Users/dikeda/workspace/research/format-legality-icons/main-integration.patch`. Reconcile these six hunks onto the parallel B candidate; do not replace B's main.ts wholesale:

1. Add `import { FormatLegality } from './ui/format-legality.js';`.
2. Instantiate one `const formatLegality = new FormatLegality();` beside the persistent ReferenceImage.
3. Call `formatLegality.clear()` in render's no-current-card reset.
4. After current card heading/name, call `formatLegality.update(c.id, c.legalities); nodes.push(formatLegality.node);`.
5. Replace old USD-primary/JPY-secondary amount nodes with JPY-primary/explicit-unavailable and following USD-secondary nodes from this diff; keep surrounding source/date/target/error metadata.
6. Remove old details/dl text-format list at the bottom of render.

Apply component plus appended scoped CSS and test diffs as companion changes. Preserve B's own layout, focus/scroll and DFC handling. Read status from session's selected physical card, not translated JP fallback. Run independent combined-candidate integration at a pinned commit in a separate worktree.

## Visual evidence and limits

`/Users/dikeda/workspace/research/format-legality-icons/synthetic-mobile.png` is outside every git checkout. Inspected using view_image: 390×844 Chromium mobile viewport, full-page screenshot, synthetic provider card with no reference image. Badge row wraps (Pauper on the next line), grey illegal badges and dashed question-mark unknown badges are distinct; restricted has superscript 1. The estimated JPY zero is prominent above smaller USD zero. No horizontal overflow in automated DOM assertion.

Independent QA/integration: PENDING. Actual iPhone Safari/Android camera/device tests: NOT RUN. No live Scryfall/FX or recognition quality claims. This supplemental candidate is not the reconciled B design, nor release approval. Playwright managed only its temporary preview on port 4217 and shut it down after each run.
