# Combined camera UI implementation candidate

2026-10-04. Integration implementation, **not independent TEST/QA or release approval**.
Worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/combined-camera-ui`.
Branch: `feat/combined-camera-ui`. Base and unchanged HEAD:
`eb321dcbdf7a26f2302de1e2e1355dae93953584`. No candidate commit; all changes unstaged.

## Integration and final behavior

Read AGENTS.md, development plan, contracts, ownership briefs and the three source
reports in their read-only source worktrees. Verified all supplied patch SHA-256
values. B was already applied and was not reapplied. Copied unconflicted format
and history modules/tests/reports from the supplied patches; manually reconciled
shared main.ts, CSS and smoke tests. Historical source reports are retained as
provenance, not combined acceptance evidence.

- Preserve B monochrome camera-first shell, explicit camera startup, full delivered
  frame/contain/aspect geometry and truthful released-camera placeholder. Search,
  local file input, rules, attribution, privacy and diagnostics remain available.
- Persistent format component immediately follows card identity/reference heading;
  reads selected physical printing, not Japanese translation fallback. Seven native
  button badges wrap on 320px. Legal is normal, banned and not-legal gray with
  distinct ×/– marks, restricted has ¹, unknown is dashed with ?. Accessible names
  and tap/Enter/Space disclosure retain exact statuses.
- JPY estimate is the prominent price, with overseas reference/approximation and
  domestic-price exclusion labels; USD is smaller and secondary. Missing FX explicitly
  leaves numeric JPY absent, missing price remains missing, and zero remains zero.
  Existing source/date and request-token protections are preserved.
- Formats increased result height. The initial union exposed next-scan below the
  viewport; moved next-scan immediately after price and before manual controls,
  preserving a visible primary action at 390px/320px and desktop. No sticky overlay.
- Persistent reference/DFC image and format state survive asynchronous quote/FX/
  printing renders. Existing scroll restoration retained. Added focus restoration
  for native details summaries as well as selects/buttons after a new test exposed
  lost keyboard summary focus on late FX. Disclosure open states remain preserved.
- History is a normal semantic section after result and camera/file actions, before
  name search; no closed details or nested scroll area. Newest first, maximum 100,
  session/tab memory only; reload clears it. Public metadata snapshots only: no
  camera pixels, input files, filenames or embeddings. One accepted metadata result
  per captured scan generation, never a record from price/FX renders or reopening.
- Manual override updates only the associated event; reopening restores exact saved
  printing/language/finish, updates image/formats/price through existing guarded
  ResultSession, stops current camera and does not restart it. Printing-list retry
  now retains the selected finish. Old detail responses cannot insert history.

No dependencies, package/config/lockfile/contracts, models, thresholds, provider
contracts, Tailscale, other worktrees or active 4195/4189 servers were changed.
No publish, commit, stage, push, merge or private image upload.

## Union changed paths

Production:
`src/main.ts`, `src/ui/style.css`, `src/ui/reference-image.ts`,
`src/ui/format-legality.ts`, `src/ui/scan-history-model.ts`,
`src/ui/scan-history.ts`, `src/ui/scan-history.css`.

Tests:
`tests/browser/smoke.spec.ts`, `tests/browser/reference-image.spec.ts`,
`tests/browser/camera-first-design.spec.ts`, `tests/browser/format-legality.spec.ts`,
`tests/browser/scan-history.spec.ts`, `tests/browser/combined-camera-ui.spec.ts`,
`tests/unit/format-legality.test.ts`, `tests/unit/scan-history.test.ts`.

Reports:
`docs/reports/camera-first-design.md`, `docs/reports/format-legality-icons.md`,
`docs/reports/scan-history.md`, `docs/reports/combined-camera-ui.md`.

Existing test adaptation: USD exact-value assertions now use `.usd` with the explicit
`USD` suffix instead of the primary `.price`; no monetary/target assertions removed.
B's rule-disclosure click precedes the existing Japanese/English body assertions.
Evidence destinations of imported implementer tests are consolidated to the requested
research folder. No skipped/deleted tests, weakened assertions or gate changes.

## Actual commands, RED/GREEN and corrections

1. `npm ci`: PASS; 87 packages, zero audit vulnerabilities; lockfile unchanged.
2. First `npm run check` and `npm run build`: failed TypeScript syntax from incomplete
   openId merge. Completed the guarded history-accept block; no claim this was TDD RED.
3. `npm run check && npm run build && MVP_PORT=4227 npm run test:e2e`:
   143 unit/regression passed; build passed; browser **55 passed / 3 failed**.
   Two failures came from an erroneous smoke-selector adaptation that dropped the
   foil/edition steps; restored every original action and expected value. Third was
   real mobile next-scan viewport regression after adding formats.
4. Added combined scenarios; `MVP_PORT=4228 npm run test:e2e -- tests/browser/combined-camera-ui.spec.ts`:
   **2 failed / 2 passed**, RED for next-scan viewport. Moved primary action above
   controls. Added explicit ×/– assertions; build plus targeted combined run on 4227
   **2 failed / 2 passed**, RED for absent status marks. Added marks.
5. `npm run build && MVP_PORT=4227 npm run test:e2e -- tests/browser/combined-camera-ui.spec.ts tests/browser/camera-first-design.spec.ts tests/browser/smoke.spec.ts`:
   **24 passed**, including restored smoke and viewport assertions.
6. Whole `npm run check && npm run build && MVP_PORT=4227 npm run test:e2e`:
   **143 unit/regression and 62 browser passed** (26.2s).
7. Added keyboard summary focus case;
   `MVP_PORT=4228 npm run test:e2e -- tests/browser/combined-camera-ui.spec.ts --grep 'focused rules'`:
   **2 failed**, RED: rules open state survived but summary became inactive on late FX.
   Extended existing focus restoration to summaries.
   `npm run build && MVP_PORT=4227 npm run test:e2e -- tests/browser/combined-camera-ui.spec.ts --grep 'focused rules'`:
   **2 passed**, GREEN.
8. **Final** `npm run check && npm run build && MVP_PORT=4227 npm run test:e2e`:
   PASS, TypeScript; **143 tests / 14 files** (2.04s); build PASS;
   **64/64 browser cases** (28.1s), Chromium desktop/mobile viewport.
   JS 35.12 kB / gzip 13.65 kB; CSS 7.95 kB / gzip 2.46 kB. Sizes are not device latency.
9. `git diff --check`: PASS. `git diff --cached --stat`: empty.
   `lsof -nP -iTCP:4227 -iTCP:4228 -iTCP:4229 -sTCP:LISTEN`: no listeners after cleanup
   (exit 1 means no matching listener). Playwright and live-smoke preview processes stopped.

Unit union: base/B 139 + format 1 + history 3 = 143. Browser union: base 34 + B 4
+ format 8 + history 12 + combined 6 = 64. All individual suites remain present.
Combined tests exercise accepted scan → physical override → JPY/formats/image/history;
older reopen restores every widget without another record; new scan plus late FX
preserves DFC face/disclosure/focus/scroll; focused rules summary survives late FX.
The existing union also exercises stale details/price/image, repeated-frame recording,
price refresh, camera stop/restart, keyboard reopen, reload clearing and 101-event bound.

## Evidence and inspection

All evidence outside git in:
`/Users/dikeda/workspace/mtg-card-scanner-research/combined-camera-ui/`.

Combined screenshots, captured by the new combined test and opened/visually inspected:

- `combined-mobile-viewport-390-initial.png`, `combined-mobile-viewport-390-result.png`,
  `combined-mobile-viewport-390-history.png`: 390×844.
- `combined-mobile-viewport-320-initial.png`, `combined-mobile-viewport-320-result.png`,
  `combined-mobile-viewport-320-history.png`: 320×844.
- `combined-desktop-1280-initial.png`, `combined-desktop-1280-result.png`,
  `combined-desktop-1280-history.png`: desktop initial/result at 1280px; history full-page.
- Desktop project also captures `combined-desktop-320-{initial,result,history}.png`.
- Imported suites retain shell/loading/result/overview/narrow and history screenshots
  in this same folder. `synthetic-mobile.png` inspected as supplementary format evidence.

**All browser fixture screenshots are SYNTHETIC** worker/provider/card/image/FX content,
not real recognition or provider evidence. Synthetic labels exist only in tests/evidence,
never inserted into production UI. History screenshots are full-page to prove normal
page placement; result screenshots show primary action in viewport. No horizontal
scroll overflow at any tested width; badge wrapping, metadata and input readability
were inspected. Native filename text can abbreviate at narrow width, but chooser/label
remain reachable. The tab-only history notice is visible and not a persistence promise.

Live public search smoke, separately executed with inline `node --input-type=module`
using Vite preview on 4229 and Chromium 390×844, without worker/model/camera:
real search “Lightning Bolt”, select first public result, await quote/FX/printings/image,
compare selected Card.prices to USD and exact decimal rounded JPY, verify seven formats,
no history event, no overflow and no page error. Public endpoints all returned 200.
`live-search.json` stores actual responses/checks: selected
`f58dba4f-1abb-47a3-a684-29c32bab95c0`, SOS #113 en nonfoil,
provider USD 1.61, ECB 157.67 dated 2026-10-02, displayed $1.61 USD / 概算 ￥254;
all comparisons passed. This is one observed provider sample, not fabricated data.
`live-search-mobile.png` captures an early image-loading moment; the follow-up
`live-search-mobile-loaded.png` explicitly awaits visible loaded public image and was
opened/inspected. Public image natural width 488; no private image used or uploaded.

## Handoff limits

Implementation complete with no known integration blocker. Independent TEST/QA is
**PENDING**, including a separate worktree at a pinned combined-candidate commit after
parent commits this unstaged candidate. This task did not supply independent approval.
Physical iPhone Safari/Android camera, actual phone startup/scan latency, background
behavior/thermal performance and real recognition accuracy: **NOT RUN**. Desktop
Chromium/mobile viewport and synthetic frames are not physical-device evidence.
No model download, private photograph, public deployment or release acceptance claim.
