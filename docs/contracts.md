# Contract v0 — bootstrap boundary

Coordinator-owned. These are initial contracts, not a completed API design.

## Price domain (src/domain/pricing.ts)

Export:
- `type FxRate = { jpyPerUsd: number; asOf: string }`
- `type PriceDisplay = { usd: string | null; jpy: string | null }`
- `formatReferencePrice(usd: string | null, fx: FxRate | null): PriceDisplay`

Return only currency-formatted labels, not claims about source/matching/freshness.
Scryfall USD inputs: nonnegative decimal strings with at most two fractional digits; trim whitespace. Missing/invalid/negative/nonfinite USD => both null. Zero is a real price, not missing.
USD label: en-US USD currency two decimal places. JPY label: ja-JP JPY currency zero decimals. FX must have positive finite jpyPerUsd and valid ISO date or ISO timestamp asOf; otherwise retain USD and return JPY null. Require strict calendar date validation (reject normalized invalid dates). Use round-half-up for nonnegative money; derive from parsed decimal values so 1.005 binary rounding does not silently change expected results. Avoid unsafe magnitudes; USD cents and rounded JPY must be safe integers; if only FX conversion overflows, retain USD and return JPY null.
No HTTP, storage, system clock, or fake default FX.

## Selection domain (src/domain/selection.ts)

Export:
- `type Selection = { oracleId: string; printingId: string; language: string; finish: string }`
- `type SelectionState = { generation: number; revision: number; selected: Selection | null; manual: boolean }`
- `type RequestToken = { generation: number; revision: number }`
- `initialSelection(): SelectionState` => generation 0, revision 0, selected null, manual false.
- `recognize(state, selection, generation): SelectionState`: ignore wrong generation or manual state; identical selection is idempotent; otherwise revision+1.
- `overrideSelection(state, selection): SelectionState`: set selection, manual true, revision+1 even if same selection (invalidate outstanding results).
- `nextScan(state): SelectionState`: generation+1, revision 0, selected null, manual false.
- `requestToken(state): RequestToken`
- `acceptsResponse(state, token): boolean`: selected not null and both generation/revision equal.

Pure immutable functions. No network/camera. Clone accepted input so callers cannot mutate state through references. Price responses must also carry the selected target in the future provider boundary; this bootstrap token is session protection, not proof of matching market/language.

## Future adapters (design only, not yet implemented)
- Recognition worker: init(manifest), recognize(frame, scanId), cancel(scanId), dispose(). Frame transfers, max one inflight; stale results discarded.
- CardRepository: card identity and Japanese display separated from physical printing/language/finish. Printings listing and manual search.
- PriceProvider: quote selected printing/language/finish, origin market/provider, currency, retrievedAt, optional providerAsOf, exact/related/missing matching status.
- FxProvider: USD/JPY rate, asOf, retrievedAt, source; no invented default.
- Render quote only if scan generation, selection revision and target still match.

Version model/catalog manifests together; interrupted updates leave last complete version active. Heavy data is not part of initial UI bundle.

## MVP executable adapters (phase delegation, 2026-10-04)

The original pure price/selection exports above remain unchanged. The sole MVP
owner was explicitly delegated root configuration/shared-contract ownership for
this phase. The following adapters are now implemented, with real Chromium mock-provider E2E now validated (see mvp-fix report).
The original implementation report preserves historical environment limitations.

- `Repository.card(id, signal)` returns one exact Scryfall `Card`; `search`/`page`
  return a page plus next URL. `printings(oracleId, signal)` consumes every page
  with `unique=prints&include_multilingual=true`. Requested card ID and every
  printing Oracle ID are checked before caching. Next URLs must be Scryfall
  `/cards/search`; cyclic pagination is rejected. Card face/text/type/mana fields
  are validated. Display Japanese translation never changes selected printing ID.
- `finishPrice(card, finish)` maps only nonfoil→usd, foil→usd_foil,
  etched→usd_etched for supported finishes. Missing stays null; zero survives.
- `ResultSession.select(card, finish)` invalidates requests using existing
  generation/revision state, clears old quote/FX immediately, aborts the previous
  request and verifies returned ID/oracle ID/language. Success/error/FX results
  all require the matching token. `reset()` increments scan generation and clears
  the result. Manual language change to an unavailable same edition explicitly
  labels the selected alternate printing; no implicit price fallback is used.
- Scryfall: shared provider scheduler; search/named/random/collection starts
  at least 510ms apart, other starts at least 110ms apart. A 429 starts a 30.1s
  provider cooldown; longer Retry-After is respected. Waiting requests are abortable.
  12-second request timeout,
  max 200 schema/identity-validated JSON cache entries for 24h in tab memory. Cache hits still
  check abort. No automatic retry on 429. User retry after failure is available.
- FX: Frankfurter v2 ECB USD/JPY endpoint, one-hour in-tab JSON cache,
  12-second timeout; direction/rate/calendar date validated by the existing
  formatter. Failure means no JPY. Latest published date is not fetch time or
  price update time. Prices display response-confirmation time and explicitly
  state provider price-update time is unavailable.
- Recognition: vendored audited upstream worker at
  `2a122d00d25c8d112a90e47bf235a021e0c53b0c`, AGPL-3.0, modified and labelled.
  Cornelius 2.12 + Milo 1.0.0 hashes and pinned catalog v52/milo1 must agree.
  Model hashes/sizes and catalog assets are verified; IndexedDB cache is optional.
  Failed updates retain the previously complete cached v50/v51 snapshot only
  when embedding model hash/family/dimensions/descriptor remain compatible.
  Intermediate candidates are never activated; fallback is labeled in the UI.
  Model download timeout 120s, initialization bound 180s, frame bound 30s.
  One reserved frame even during model load; dispose rejects outstanding work.
  CPU/WASM one thread only. No WebGPU option. Camera preview starts independently
  of model readiness. Results from old camera/file generations are discarded.
- Candidate-first recognition (explicit user supersession, 2026-10-04): one valid
  card-present, corners-valid, finite cosine≥0.50 observation proposes a physical
  printing. No score/margin/streak automatically accepts a camera or file match.
  File input runs one bounded inference, then waits for explicit confirmation.
  Similarity is uncalibrated cosine, not probability. Detection uses four corners
  and perspective warp. Camera input remains the complete delivered frame,
  uniformly resized to maximum edge 1024 without upscaling/cropping. Preview
  retains delivered aspect ratio/contain; resizeMode:none remains an ideal request.
- Continuous camera lifecycle: `これです` alone records recognized metadata in
  history/result, without stopping capture or the one-inflight inference loop.
  Candidate updates never replace confirmed/manual selections. Explicit camera
  start is required; stop/error/hidden document/pagehide release tracks, pagehide
  terminates worker. Resume requires explicit start. History/name search stop
  capture before showing the selected result. New camera/file sessions reset
  scan context. Manual name-search semantics are unchanged and do not record scans.
- Confirmation pins the displayed immutable proposal version/printing ID, verified
  Repository card and default supported finish (nonfoil preferred). Pointer and
  held-key interactions cannot accept a replacement identity. Each confirmation
  creates exactly one tab-only event (newest 100 retained); no pending/unconfirmed
  history row. Manual physical overrides update that confirmed event. Confirmed
  stationary Oracle identity (printing ID fallback) is suppressed until three
  consecutive cardPresent:false observations spanning≥600ms, a different confirmed
  card, or explicit scan-context reset. Low score/invalid corners interrupt absence.
  No result reveal, focus request or scroll is triggered by proposals/confirmation.
- Green detection overlay uses only real normalized full-frame worker corners,
  independent of identity acceptance. Validate exactly four finite [0,1] pairs,
  area≥0.01, pair distance²≥0.0004 and strictly convex order. No clamping or invented
  corners. Map to the exact video contain content rect including letterbox offsets;
  canvas backing size follows CSS size×DPR on each rAF, covering resizes/rotation.
  Clear immediately on reported loss/invalid geometry, stop/error/background/new
  stream, and when the frame geometry is more than 1500ms old (capture timestamp, not
  delayed response arrival). Detection status is neutral and
  separate from accepted identity. rAF only paints latest geometry; detector cadence
  remains inference completion plus 180ms, one frame inflight, no frame queue or
  claim of 60fps recognition. Large stable camera viewport is 50svh (300–560px).
- Remote content uses text nodes, never HTML injection. No image/embedding upload,
  no analytics. Local timing ring buffer (300 events) is available on demand.

Public use is not authorized by this executable contract. AGPL/source-offer,
model/data/image licensing, independent combined-candidate QA and real-device
performance gates remain separate release requirements.

## Candidate-first information and recognition settings (2026-10-04)

This latest user-authorized behavior intentionally replaces automatic acceptance.
A valid physical printing candidate appears as `もしかして？` after one observation
at cosine≥0.50. Every camera/file recognition match requires `これです`; high
scores/repetitions never mutate history/result. There is no auto-enable setting.
`違う` suppresses the stationary Oracle identity until different valid context or
sustained absence. Versioned pointerdown/Enter/Space gestures pin identity;
held Space/Enter repeats and blur/window blur/pointercancel cannot accept B through
an A gesture. Stop/restart and settings invalidate in-flight evidence.

The main candidate panel is in normal document flow, with persistent confirmation
controls before progressively loaded information. It shows a full reference image,
verified Japanese display name (same Oracle; matching set/number preferred, then
other Japanese printing), English Oracle name, physical expansion name/code,
collector number/language/default supported finish, overseas approximate JPY
primary and USD secondary, and existing paper-format icons/disclosures. Missing
Japanese printed_name is explicitly unavailable; English is never relabelled as
Japanese or translated. Japanese display lookup never changes physical image,
price, expansion, language or finish. Banned/not-legal icons are grey, restricted
and unknown remain distinct. Safe image URLs and existing DFC behavior are reused.

Candidate prices use a separate ResultSession with matching generation/revision,
exact printing ID/Oracle/language and supported finish. Null differs from zero.
Absent/invalid FX retains USD only, no fixed FX; Scryfall response-confirmation
time is distinguished from unavailable price-update time, and Frankfurter/ECB
latest publication date is shown. All earlier candidate fields are cleared on
replacement; late card/JP/image/price/FX callbacks cannot populate a newer version.
Candidate state has no write path to confirmed session, manual controls or history.

Existing Repository/JsonClient parsing, rate scheduler, 429 handling, timeouts and
bounded tab caches apply. A separate candidate Repository request queue prevents
slow confirmed printing-list requests from blocking a new proposal; provider
limits remain shared. Exact-card snapshots and same-Oracle printing lists coalesce
with 100-entry/60-second caches including failures, and superseded pending requests
abort. FX coalesces independently through the same cache wrapper plus the existing
one-hour provider cache; a cached global USD/JPY rate can be reused across cards.
Confirmed result requests still use the main Repository, so explicit confirmation
can fetch a card/list once more in that separate cache. No new calls per frame:
same-version observations update raw score only, and metadata/price/FX never block
inference. Card images continue to be public provider reference images.

Collapsed `認識設定（デバッグ）` follows search. Tab memory only, reload defaults:

| Setting | Default | Inclusive bounds | Integer |
|---|---:|---:|---|
| Tentative cosine | 0.50 | 0–1 | no |
| Post-inference delay, ms | 180 | 0–2000 | yes |
| Consecutive absence rearm observations | 3 | 1–20 | yes |
| Absence rearm elapsed time, ms | 600 | 0–10000 | yes |
| Geometry stale timeout, ms | 1500 | 100–10000 | yes |

Automatic score/margin/streak controls and defaults are removed. Numeric diagnostic
score/margin remain read-only. Invalid/empty/nonfinite/out-of-range/fractional
integer values restore the real current value with an error. Tentative score may
be any finite value in [0,1], without an obsolete auto-score relationship. Applying
settings/reset invalidates proposals/inflight evidence/geometry and resets absence,
preserving confirmed manual state/history/accepted suppression and live stream.
Already scheduled delay completes; later scheduling uses the new value. Model,
geometry validation and worker thresholds are unchanged. Independent combined QA
and real phone validation remain separate requirements.
