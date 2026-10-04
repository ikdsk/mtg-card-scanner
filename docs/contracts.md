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
  warp; camera frame is the displayed guide plus padding, maximum 720×1003.
- Result fixation stops camera/inference. Visibility/pagehide stop camera tracks;
  pagehide also terminates worker. Resume requires the explicit camera button.
- Remote content uses text nodes, never HTML injection. No image/embedding upload,
  no analytics. Local timing ring buffer (300 events) is available on demand.

Public use is not authorized by this executable contract. AGPL/source-offer,
model/data/image licensing, independent combined-candidate QA and real-device
performance gates remain separate release requirements.
