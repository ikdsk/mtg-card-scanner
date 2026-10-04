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
