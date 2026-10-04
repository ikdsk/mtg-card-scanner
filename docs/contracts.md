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
- Candidate gate: two valid same-ID results, cosine≥0.75 and distinct-oracle
  margin≥0.025. These are **uncalibrated conservative trial thresholds**, not
  an accuracy or probability claim. File-input repeats are deterministic repeats,
  not independent image samples. Detection uses four corners and perspective
  warp. Camera input is the complete delivered video frame, uniformly resized
  to a maximum edge of 1024 without upscaling or source cropping (integer pixel
  rounding allowed). Preview uses the delivered aspect ratio and contain so its
  visible image agrees with inference input. Native resizeMode:none is an ideal
  preference, not a guarantee about physical sensor modes on every browser.
- Continuous camera lifecycle (explicit user supersession, 2026-10-04): acceptance
  does not stop the camera or bounded inference loop. File input remains a finite
  two-repeat scan. Camera permission requires an explicit start action. Stop,
  errors, hidden document and pagehide release tracks; pagehide also terminates
  the worker. Resume requires explicit start. History inspection and name search
  stop the camera before displaying a selected result.
- Camera acceptance still requires the existing two same-printing-ID valid frames,
  cosine≥0.75 and distinct-oracle margin≥0.025. A separate event guard groups the
  accepted printing by the real worker's `scryfallOracleId` (printing ID fallback
  if unavailable), so printing jitter cannot refetch or undo a physical override.
  A different stable Oracle card creates a new event. The same card rearms only
  after at least three consecutive `cardPresent:false` completed detector results
  spanning ≥600ms. Ambiguous/low-score/card-present invalid-corner results interrupt
  absence and never rearm. This is a conservative trial policy, not calibrated
  removal accuracy; physical swaps without reported absence may be suppressed.
- Every camera acceptance reserves a tab-only history event immediately, bounded
  to the newest 100 events. Until verified provider metadata arrives the row shows
  only the actual candidate ID and lookup status. Superseded/failed metadata stays
  labeled unavailable, never fabricated. Each event resets selection generation,
  invalidates old metadata/printing-list/price/FX responses, and updates the latest
  result asynchronously while capture continues. Manual physical selection updates
  that event; only a genuinely new accepted event can replace it. Live acceptance
  never reveals/scrolls the result; deliberate history/file/manual selections may.
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

## Live tentative confirmation and optional recognition settings (2026-10-04)

Explicit latest user authorization extends the continuous candidate. A valid
card-present / cornersValid observation with a printing ID and finite cosine
similarity ≥0.50 creates a nonmodal `もしかして？` proposal after **one** observation;
no automatic acceptance threshold is lowered. Show verified reference metadata
and a compact thumbnail when available, actual candidate ID while loading, and
`類似度 0.623` style raw cosine values. Latest diagnostic score and distinct-Oracle
margin are also displayed. Neither value is a calibrated confidence probability.
The green quad means detected geometry only.

Proposal updates never request focus, scroll, stop capture, create history, fetch
prices/FX or replace confirmed/manual selections. `これです` accepts only matching,
verified, available printing metadata; unavailable lookup truthfully refuses.
Pointerdown / Enter / Space capture an immutable version and printing identity.
If evidence changes during the interaction, confirmation is ignored rather than
confirming a different card. `違う` suppresses stationary same-Oracle proposals
(printing ID fallback), until valid different-Oracle context or sustained absence.
Confirmed same-card proposals remain suppressed until the existing absence rearm
or a genuinely different accepted card. Explicit Stop/new scan clears scan-context
suppression. Camera confirmation joins the continuous acceptance guard and history,
without stopping capture. Existing strong automatic acceptance reconciles/hides the
proposal. File input retains finite two-repeat auto scanning, while its first valid
observation can already be explicitly confirmed; its old repeat cannot overwrite
that confirmation.

Snapshot metadata requests use the existing validated Repository/JsonClient,
provider scheduler (110ms card / 510ms search starts and 429 cooldown), tab cache,
and an additional coalesced 100-entry / 60-second snapshot cache including failures.
Superseded pending snapshots are aborted, so a slow proposal does not block a new
accepted card behind the client's request queue. Generation/version checks reject
late dismissed/replaced responses. No inference fixture ID is a product input.
Thumbnail URLs require HTTPS and an approved Scryfall image hostname.

The optional collapsed `認識設定（デバッグ）` panel follows the search panel.
Values are tab memory only; reload restores defaults, with no storage/eval. Controls
apply on change, and the reset button reapplies every default:

| Setting | Default | Inclusive bounds | Integer |
|---|---:|---:|---|
| Tentative cosine | 0.50 | 0–1 | no |
| Automatic cosine | 0.75 | 0–1 | no |
| Distinct-Oracle auto margin | 0.025 | 0–1 | no |
| Same-printing auto observations | 2 | 1–10 | yes |
| Post-inference delay, ms | 180 | 0–2000 | yes |
| Consecutive absence rearm observations | 3 | 1–20 | yes |
| Absence rearm elapsed time, ms | 600 | 0–10000 | yes |
| Geometry stale timeout, ms | 1500 | 100–10000 | yes |

Invalid/empty/nonfinite/out-of-range/fractional-integer values and tentative cosine
above auto cosine are rejected, restoring the current real value with an error.
Score/margin inputs use 0.001 UI steps; finite values within bounds are accepted.
Setting changes/reset clear streaks, pending proposals and geometry, reset absence
counts/timestamps, and invalidate in-flight evidence. They preserve confirmed
selection, physical override, history and continuous accepted-identity suppression,
and do not request permission/restart camera. A pending scheduling timer uses its
already scheduled delay; subsequent scheduling uses the new value. File input is
still at most two repeats even when configured auto observations exceed two, so
explicit confirmation remains available. Detector minCornerConfidence is **not**
exposed because this candidate does not wire a worker detector setting end-to-end.
Independent combined TEST/QA and real phone validation remain separate requirements.
