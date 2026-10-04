# Recognition metadata gating and DFC follow-up

Branch: `fix/recognition-preload`; HEAD/base `5ed9293c1b5eea123136617995f67336b91f67c6`.
No new commit, push, deployment, dependency/configuration/lockfile/shared-contract edit, or other-worktree modification.
All intentional dirty preload changes and tests supplied at task start remain present.
Original preload evidence remains in `docs/reports/recognition-preload.md`.

## Cause and resulting behavior

`src/main.ts:presentSuggestion` previously opened the result-like candidate panel immediately with `next.cardId` as its title, leaving failure messaging inside details. It now keeps the panel and both candidate actions hidden until an exact Repository-validated physical Card with a usable non-ID name resolves. Pending/error messaging is generic in `.empty-candidate`; blank names, a name equal to the physical/Oracle ID, failed requests and stale requests cannot produce a candidate/history entry. Current immutable proposal version and generation guards still gate every callback and gesture. Announcements only occur after metadata validation.

The supplied real English Delver snapshot has neither root image_uris nor printed_name. Images are on card_faces. Japanese MID `762a4b35-0a1a-419c-9f62-fb2e6f24891e` has English placeholders in face printed_name; ISD `c0cea2af-422d-4718-913c-56a1d1c33ba9` has the usable names `秘密を掘り下げる者 // 昆虫の逸脱者`. The old root-only filter missed both. `src/data/japanese-name.ts` validates Japanese display names, joins complete face names when root names are unavailable, rejects identical English/empty/incomplete names and unrelated Oracle metadata, and prefers usable matching physical set/number, then matching set, then usable Japanese fallback. Already-Japanese cards also get fallback lookup when their own names are unusable. This display choice never replaces the physical Card used for image, price, set, collector number, language or finish.

Confirmed titles and rules use the same helper. Confirmed history gets the already-verified Japanese display name captured at acceptance, separate from physical Card snapshots, plus face-derived names for Japanese Cards. No late Japanese lookup writes unconfirmed or stale history. The legacy pending history presentation no longer renders IDs.

Worker `loadCatalogV2` dropped record.faceIndex; search and processFrame dropped it again. The modified worker retains a validated binary physical face (1 = back, absent/invalid = front) at all three boundaries. LiveCandidate includes that face in its immutable proposal version. Same-face observations only update score; another recognized face invalidates earlier held gestures and initializes that physical face's image. ReferenceImage tracks the recognized face separately from manually selected face, so price/FX and repeated same-face updates preserve manual switching. Confirmation passes the recognized face to the confirmed view; manual finish/price changes retain its current display face. A different physical printing safely initializes front unless fresh recognition supplies a face.

## Changed paths

Follow-up production:
- `src/main.ts`
- `src/data/japanese-name.ts`
- `src/recognition/gate.ts`, `src/recognition/live-candidate.ts`
- `src/ui/reference-image.ts`, `src/ui/scan-history.ts`
- `public/recognition/scanner.worker.mjs`, `public/recognition/THIRD-PARTY-NOTICES.md` (modified notice updated)

Follow-up tests:
- `tests/unit/japanese-name.test.ts`, `tests/unit/live-candidate.test.ts`, `tests/unit/worker-face.test.mjs`
- `tests/browser/dfc-metadata.spec.ts`, `tests/browser/live-candidate.spec.ts`, `tests/browser/continuous-camera.spec.ts`, `tests/browser/scan-history.spec.ts`
- `tests/fixtures/delver-en.json`, `tests/fixtures/delver-ja.json`

Preserved pre-existing dirty work:
- preload parts of `src/main.ts`
- `tests/browser/recognition-preload.spec.ts`
- prior visible-action selector adjustment in `tests/browser/candidate-immersive.spec.ts`
- `docs/reports/recognition-preload.md` (only appended follow-up report pointer)

Fixture sources, read only:
`/Users/dikeda/workspace/mtg-card-scanner-research/dfc-delver-en.json` and
`/Users/dikeda/workspace/mtg-card-scanner-research/dfc-delver-ja.json`.
The checked-in test inputs project the supplied public JSON into relevant provider fields. Browser transport/images/camera/recognition are mocked; these are provider-shaped snapshot replays, not new live provider or recognition measurements.

## Strict vertical RED / GREEN evidence

Every numbered behavior was run RED before its production implementation, then GREEN. Local logs are ephemeral `/tmp/dfc-*.log`.

1. Pending metadata is no recognition result and late stopped metadata cannot resurrect.
   - `npm run build` exit 0.
   - RED: `MVP_PORT=4271 npm run test:e2e -- tests/browser/live-candidate.spec.ts --grep 'pending metadata is'` exit 1, **2 failed**, generic empty status missing (old panel showed raw ID).
   - After metadata gating, same command exit 0, **2 passed** (`dfc-red-1.log`, `dfc-green-1.log`).
   - Old continuous-camera raw-ID expectation was replaced with hidden-panel/non-ID assertions; its replacement/stale response/one-event assertions remain.

2. Pure Japanese DFC helper bootstrap.
   - RED: `npx vitest run tests/unit/japanese-name.test.ts` exit 1, missing new helper module (suite import failure, not a behavior assertion).
   - Helper implementation: same command exit 0, **1 passed** (`dfc-red-2.log`, `dfc-green-2.log`).
   - The actual end-to-end root-filter behavior RED follows in item 3.

3. English and already-Japanese MID DFC names resolve usable ISD fallback while retaining physical identity/image.
   - RED: `MVP_PORT=4271 npm run test:e2e -- tests/browser/dfc-metadata.spec.ts` exit 1, **4 failed**: Japanese name unavailable instead of joined Japanese face names.
   - After main UI wiring and successful build, same command exit 0, **4 passed** (`dfc-red-3.log`, `dfc-green-3.log`).
   - Test authoring interruption: initial JSON imports required `with {type:'json'}`. First attempted GREEN build found an overly narrow inferred fixture parameter type; fixed to Card before the recorded successful GREEN. An accidental subsequent invocation on stale dist failed; it was not counted as successful verification.

4. Immutable recognized face versions and legacy/malformed defaults.
   - RED: `npx vitest run tests/unit/live-candidate.test.ts` exit 1, **1 failed / 4 passed**, back face was undefined.
   - After adding optional face input and face-sensitive versions, same command exit 0, **5 passed** (`dfc-red-4.log`, `dfc-green-4.log`). Invalid -1/2/NaN/Infinity/fraction/string and absent face default front; held old snapshot is invalid.

5. Vendored worker catalog → search → result face contract.
   - RED: `npx vitest run tests/unit/worker-face.test.mjs` exit 1, **1 failed**, best.faceIndex undefined.
   - After worker changes, same command exit 0, **1 passed** (`dfc-red-5.log`, `dfc-green-5.log`).
   - Test executes actual vendored class, catalog loader, search and processFrame in a VM with synthetic catalog/vector/canvas bindings, no ONNX. Both face rows plus invalid/absent records are checked. Test harness initially supplied no valid corners and exercised the no-result branch; corrected to a valid quad to exercise the intended successful frame pipeline.

6. Back initializes reference; manual switch persists; new recognized face and confirmation retain the appropriate image.
   - `npm run build` exit 0.
   - RED: `MVP_PORT=4271 npm run test:e2e -- tests/browser/dfc-metadata.spec.ts --grep 'recognized back'` exit 1, **2 failed**, front URL instead of back URL.
   - After ReferenceImage/main plumbing and build, same command exit 0, **2 passed** (`dfc-red-6.log`, `dfc-green-6.log`).

7. Confirmed history preserves verified Japanese display names separately from physical metadata.
   - RED: `MVP_PORT=4271 npm run test:e2e -- tests/browser/dfc-metadata.spec.ts --grep 'Japanese face names'` exit 1, **4 failed**, history still English.
   - After separate bounded display-name snapshots, `npm run check`, `npm run build`, `MVP_PORT=4271 npm run test:e2e -- tests/browser/dfc-metadata.spec.ts` exit 0, **20 passed** (`dfc-red-7.log`, `dfc-green-7.log`). This also covers rejected, blank and ID-as-name metadata, absent Japanese names, native held Space face replacement, held Enter suppression, manual finish and both physical language cases.

8. Prefer usable Japanese within physical set before older-set fallback, even when collector number differs.
   - RED: `npx vitest run tests/unit/japanese-name.test.ts` exit 1, **1 failed / 2 passed**, ISD fallback chosen instead of synthetic usable same-set alternate number.
   - After adding same-set preference, same command exit 0, **3 passed** (`dfc-red-8.log`, `dfc-green-8.log`). No physical identity mutation.

Additional boundaries include mismatched Oracle, incomplete/English face names, dismissed deferred Japanese lookup, missing Japanese/FX, unchanged physical USD/null price, stale A→B metadata, settings invalidation, and pointer/key/blur gesture safety.

## Full regression adjustments and evidence

First full run: `MVP_PORT=4271 npm run test:e2e` exit 1, **7 failed / 165 passed** (`dfc-e2e-all.log`).
- Two obsolete Enter tests relied on an actionable failed-metadata panel. Revised to native Enter accepting verified A on initial keydown, held repeat not accepting B, and fresh released gesture accepting B. Exact native repeat evidence and event counts remain.
- Two canceled-window-blur tests expected a fresh keyboard press to activate after hidden pending panel naturally lost focus. Test now explicitly focuses the new verified button for a new deliberate gesture; stale/repeat cannot accept assertions remain. Production does not move focus on proposal changes.
- One cadence test measured 400ms from delayed metadata arrival rather than from frame start. Aligned measurement to a new frame; retained the original 700ms delay, 400ms no-frame assertion, expiry and rearm assertions. No timing threshold changes.
- Two 100-history tests used a shared Japanese Oracle name to identify eviction. Japanese name is now correctly shared across all physical printings. Assert removed physical ALT #2 ja edition and exactly 100 retained TST #1 en rows instead; original count/cap/101-scan assertions remain.

Affected verification: `npm run check` and `npm run build` exit 0, then
`MVP_PORT=4271 npm run test:e2e -- tests/browser/live-candidate.spec.ts tests/browser/dfc-metadata.spec.ts tests/browser/scan-history.spec.ts` exit 0, **78 passed (32.4s)** (`dfc-affected-final.log`).
No test skips, weakened race checks or threshold relaxation.

Final verification follows below after the final full run.

## Limits / blockers

Human iPhone Safari / Android tests, physical scan accuracy, real-device latency, and new live Scryfall/provider verification: **NOT RUN**. Chromium mobile viewport is not a phone. VM worker tests use synthetic embeddings and canvas bindings; they prove face-contract propagation, not ONNX recognition accuracy.

Parent supplied independent deployed-HTTPS successful real-worker initialization evidence in Chromium and desktop WebKit. That is parent evidence, not a new measurement from this worktree; desktop WebKit is not iPhone Safari. User initialization error remains not reproduced; this follow-up does not invent an asset/runtime workaround or claim its cause is fixed.

No implementation blockers remain. Independent TEST/QA and a pinned combined-candidate run in a separate worktree remain coordinator responsibilities; no release/deploy authorization was requested or used.

## Final verification (same isolated dirty candidate)

After the final same-set preference, physical-price assertions and deferred-dismiss
case were added, all commands used this worktree and browser port **4271**:

- `npm run check`: exit 0, **21 files / 163 tests passed**, 2.05s.
- `npm run build`: exit 0; Vite 8.3.2, 25 modules; JS 52.74 kB (gzip 19.05 kB), CSS 16.33 kB (gzip 4.07 kB), 54ms bundling.
- `MVP_PORT=4271 npm run test:e2e`: exit 0, **174 passed (54.8s)**, both configured desktop and mobile-viewport Chromium projects, all test files, no skips. Includes all preserved preload lifecycle tests.
- `git diff --check`: exit 0.

Final logs: `/tmp/dfc-check-final.log`, `/tmp/dfc-build-final.log`,
`/tmp/dfc-e2e-final.log`. These local temporary logs are not committed artifacts.
Branch remains `fix/recognition-preload`; HEAD remains
`5ed9293c1b5eea123136617995f67336b91f67c6`; all requested changes are intentionally
uncommitted for coordinator review/integration. No push/deploy or other-worktree
mutation occurred.

## Parent cadence verification follow-up (2026-10-04)

Scope for this narrow follow-up: only `tests/browser/live-candidate.spec.ts`
(including its inline synthetic worker helper) and this report. Product files and
all supplied intentional dirty fixes were preserved. Branch/base remain
`fix/recognition-preload` / `5ed9293c1b5eea123136617995f67336b91f67c6`;
no new commit, push, deploy, or other-worktree changes.

RED evidence: parent command's full-suite log
`/Users/dikeda/workspace/mtg-card-scanner-research/preload-dfc-parent-e2e.log`
records exit 1, 173 passed / 1 failed, desktop cadence expected 2 frames but got 3.
The preceding report's frame-alignment fix was insufficient: `expect.poll` can
observe a frame late, so starting a 400ms runner wait at that observation does not
start at dispatch/completion. This is a test measurement defect; no product bug
was proven and no product change was made. The captured parent RED is retained;
this follow-up did not rerun the flaky old test to manufacture another failure.

The synthetic helper now records `performance.now()` at actual worker dispatch
and immediately before result delivery, plus each captured presence value. It
notifies in-page completion waiters after the actual application loop's result
continuation. The cadence test executes its unchanged 400ms checkpoint and
presence transitions in-page from these events, without runner polling. Every
successive completion-to-dispatch gap must be >= the configured **700ms**. The
checkpoint requires unchanged frame count and expired overlay under the existing
100ms expiry setting. One false observation followed by true must keep the
candidate suppressed; two consecutive false completions followed by true must
rearm it with rearmCount=2 and rearmMs=0. The exact last-five captured presence
sequence is checked as false/true/false/false/true. Existing elapsed-rearm test
remains unchanged. No retries, skips, threshold relaxation or longer sleeps.

GREEN narrow command:
`MVP_PORT=4271 npm run test:e2e -- tests/browser/live-candidate.spec.ts --grep 'delay and both' --repeat-each=10`
Exit **0**, **20 passed (23.8s)**, 10 per configured Chromium project.
Log: `/tmp/dfc-cadence-repeat.log`. Every run attaches full `frame-timings` JSON
and prints it to the log. Measured completion-to-next-dispatch evidence:

| Project | Intervals | Minimum gap ms | Maximum gap ms | 400ms checkpoint elapsed range ms |
|---|---:|---:|---:|---:|
| desktop | 60 | 700.3000000715256 | 719.0 | 400.89999997615814–420 |
| mobile-viewport | 60 | 700.4000000953674 | 718.8000000715256 | 401.2000000476837–414.6999999284744 |

All checkpoints kept the completion frame count and had data-detected=false;
all one-absence checks remained hidden; all two-absence returns showed Alpha.

`npm run check`: exit **0**, **21 files / 163 tests passed**, 2.07s.
Log: `/tmp/dfc-cadence-check.log`.

These are synthetic browser scheduling/regression measurements, not real-worker
inference speed, model accuracy, provider behavior, or phone measurements. Parent
also reports successful public Delver back-image -> real worker -> correct back
image plus Japanese names; that remains parent-supplied evidence, not a new run
from this follow-up. Human device tests remain **NOT RUN**.

Full regression: `MVP_PORT=4271 npm run test:e2e`: exit **0**,
**174 passed (56.1s)** across both configured Chromium projects, no skips.
Log: `/tmp/dfc-cadence-e2e-all.log`. This used the existing parent-verified build;
no product/build assets changed in this test-only follow-up.
`git diff --check`: exit **0**.
No new blockers. Independent combined-candidate and human-device QA remain
coordinator responsibilities; no release claim is made.
