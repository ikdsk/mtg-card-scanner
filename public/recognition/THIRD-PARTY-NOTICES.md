# Third-party notices — local/internal evaluation only

This is a modified CollectorVision scanner. Upstream: HanClinto/CollectorVision,
commit `2a122d00d25c8d112a90e47bf235a021e0c53b0c`.
`scanner.worker.mjs` and `lib/collectorvision-catalog-v2.mjs` are from that
repository and retain its AGPL-3.0 terms. Full license: `LICENSE-AGPL-3.0.txt`.
Authors and contributors retain their copyrights. No separate commercial or
noncommercial license has been obtained. The worker is modified to pin assets,
force one-thread WASM, verify model hashes, bound downloads, allow a local asset
mirror, retain init messages during runtime import, and return a margin between distinct card identities. The catalog client
is modified to retain a previously complete,
compatible cached snapshot when an update fails. Runtime import and local gzip
transport were corrected. This application is not represented as MIT licensed.

Cornelius 2.12: HanClinto/cornelius @
`9280009f5a66f75f952820d9dadb894909b759b7`, AGPL-3.0 model-card declaration.
Milo 1.0.0: HanClinto/milo @ `9bcc5e809e936b8c5630d1e7101aae1de1e76621`,
AGPL-3.0 model-card declaration. Models are downloaded, never committed.

CollectorVisionCatalog v52, embedding family milo1, Scryfall MTG:
pinned base v50 + deltas v51/v52, original feed checked_at
2026-10-03T12:37:28Z. Feed source blob `037ff1f2e74faccfdeea9043f0a021bff138bc82`.
This app commits only the MTG descriptor/URLs/hashes, not catalog data or images.
Catalog repository software MIT license does not establish rights to underlying
card data, images, or embedding redistribution. Review these separately before
public use. Data is English-first paper printings; Japanese recognition accuracy
and physical printing/language/finish inference are not established.

ONNX Runtime Web 1.24.3, Microsoft/contributors, MIT. Runtime downloaded from
version-pinned jsDelivr npm distribution; preserve its LICENSE and third-party
notices when redistributing. Local preparation copies the actual LICENSE and
ThirdPartyNotices.txt from the official Microsoft v1.24.3 tag, hash-verified:
https://github.com/microsoft/onnxruntime/blob/v1.24.3/LICENSE
https://github.com/microsoft/onnxruntime/blob/v1.24.3/ThirdPartyNotices.txt . Vite/Vitest/Playwright/TypeScript and their
dependencies retain their installed license files. No runtime is committed.

Scryfall API metadata and prices: https://scryfall.com/docs/api . Respect API
terms: search/named/random/collection start at least 510ms apart; other requests
at least 110ms apart, shared per provider transport. After 429, wait at least
30.1 seconds and honor longer Retry-After. Cache only validated responses for 24h.
Rate limits: https://scryfall.com/docs/api/rate-limits . No paywall or proxy.
Magic card art/text/trademarks belong to Wizards of the Coast and other owners;
Scryfall is not a grant to redistribute artwork or models without conditions.
Do not obscure image artist/copyright attribution. This app does not display
remote card images; any validation images stay in ignored local artifacts.

Frankfurter: https://frankfurter.dev , ECB reference-rate provider.
API use is free/no-key; provider terms govern rates. Rates have a published date,
not a live trading timestamp. No fixed fallback rate.

Public hosting, network use or distribution requires explicit release approval
and a full compliance decision, including AGPL Corresponding Source access for
the combined application, model/data/image rights and any third-party notices.
A private GitHub repository alone does not fulfill a public source-offer duty.
The localhost internal experiment is not a release authorization.
