# reversible-card-oracle-id report

Base commit adea741, branch fix/reversible-card-oracle-id. Not pushed, not deployed until coordinator verification below.

## Bug (user-reported, real device)
Scanning the Japanese "草むした墓" (Overgrown Tomb, RTR #243) showed "日本語名は利用できません" and fell back to the English RTR printing, even though the Japanese printing exists on Scryfall.

## Root cause (confirmed against live Scryfall data)
`Repository.printings(oracleId)` fetches `oracleid:<id> game:paper` and rejects the whole page with `ProviderError('版一覧の対象が一致しません')` if any returned card's top-level `oracle_id` differs from the requested id (`page()`, repository.ts).

Scryfall's `reversible_card` layout (recent "Card // Card" reprints, e.g. Edge of Eternities Commander #347-351) returns `oracle_id: null` at the top level; the real oracle_id lives only on each face (`card_faces[].oracle_id`, identical on both faces). One such card appearing anywhere in a 60+ card printings list caused the entire list — including the Japanese printing — to be discarded.

Confirmed on all 10 shockland oracle cards: 5 of 10 (Steam Vents, Temple Garden, Overgrown Tomb, Hallowed Fountain, Blood Crypt) have an ECL reversible_card reprint and were broken; the other 5 (Watery Grave, Stomping Ground, Godless Shrine, Sacred Foundry, Breeding Pool) don't have one yet and were unaffected — but any future such reprint will break them identically. The fix is general, not shockland-specific.

## Changed files
- `src/data/repository.ts` — new `resolveOracleId(c)` helper: uses the top-level `oracle_id` if it's a string, else falls back to `card_faces[0].oracle_id`, else throws. `parseCard` uses it and returns the resolved id (`{ ...c, oracle_id: oracleId }`) so downstream code always sees a correct string. The existing oracle-mismatch guard in `page()` is untouched and still protects against genuinely wrong data.
- `tests/unit/providers.test.ts` — two new tests: resolves oracle_id from `card_faces[0]` when top-level is null (reversible_card shape), and still rejects when no oracle_id is resolvable anywhere.

## RED / GREEN
- RED: new reversible_card test failed before the fix (`parseCard` threw on `oracle_id` type check).
- GREEN: `npm run check` → 26 files / 196 tests passed (was 194; +2 new tests). `npm run build` passed.
- `MVP_PORT=4315 npx playwright test` → 330/330 passed (no browser-level regression; this bug only manifests with specific real catalog data not present in SYNTHETIC fixtures).

## Real-data verification (not just the synthetic fixture)
Direct Scryfall API calls (Node fetch with a custom User-Agent, outside the test suite):
- Overgrown Tomb (oracle `975ec9a3-...`): 63 printings fetched, 0 unresolved after the face fallback, 6 ja printings found including RTR #243.
- Checked all 10 shockland oracle ids the same way: 5/10 have the ECL reversible_card reprint; with the fix, oracle-id resolution succeeds for all of them (0 unresolvable in every case); ja counts: Hallowed Fountain 6, Watery Grave 8, Blood Crypt 7, Stomping Ground 8, Temple Garden 6, Godless Shrine 8, Sacred Foundry 8, Breeding Pool 8, Overgrown Tomb 6, Steam Vents 6.

## Design decisions
- Fallback only to `card_faces[0]`, not a search across all faces: Scryfall's reversible_card layout always has identical oracle_id across faces (same card, same rules, different styling), so the first face is sufficient and simpler than scanning all faces.
- Resolved id is written back onto the returned `Card` object rather than left as the raw (possibly null) value, so every caller downstream keeps working with a plain `string` as the `Card` type already promises — no changes needed outside `repository.ts`.
- The top-level `oracle_id` required-field check was removed from the `for (const key of [...])` loop and replaced by `resolveOracleId`, which is strictly more permissive (accepts everything the old check accepted, plus the reversible_card shape).

## Known limits
- Only the first face is checked as a fallback; if Scryfall ever ships a reversible_card (or similar) with differing oracle_id across faces for a legitimate reason, this would silently pick the first one. No such case is known to exist today.
- This was implemented directly by the coordinator (not delegated to a Sonnet subagent) because the Claude Code CLI OAuth session expired again mid-session and this was a live user-reported bug; a long-lived `CLAUDE_CODE_OAUTH_TOKEN` was set up afterward (user-provided, in `~/.env`) to avoid repeat session expiry for future delegated work.
