# MVP integration status

## Scope
This is a private development integration candidate, NOT a release or a declaration that the MVP is complete.

- Parent and independent QA: 130 unit/regression tests, typecheck, build, 18 Chromium E2E passed.
- Independent final fix review: docs/qa/mvp-review-3.json, passed=true for the reviewed correction patch.
- Live reference-image exercise: Japanese Lightning Bolt recognized to correct Oracle; live Scryfall USD/FX and explicit Japanese printing override/null price checked. Physical printing is NOT automatically established.
- Synthetic video through actual getUserMedia/worker: recognition, correct Oracle, track stop, manual search passed. NOT a physical camera or phone test.
- New card result is brought into view once; later metadata/price/FX changes preserve user position and focus.
- A catalog persistence failure preserves the previous complete compatible snapshot for later fallback.

## Still blocked
- Issue #11: automatic corner detection gives inaccurate crops on newest Japanese and other reference inputs. Known-crop diagnostic success is NOT automatic recognition success. A separate contour-refinement experiment is running; it is not included in this PR.
- iPhone/Android physical camera quality, first-visit download and mobile latency remain NOT RUN.
- Third-party distribution/source compliance and asset rights need the release checks in docs/research/mvp-release-risks.md plus user approval. No public deployment has occurred.
- Scryfall bulk-first supply design is a recorded proposal, not implemented. This candidate uses rate-limited and validated API/cache paths.

## Evidence limitations
Chromium mobile viewport is not a phone. Mock/runtime fixtures are not live data. Public reference images and synthetic perturbations are not independent photographs. Local asset loading does not measure internet download latency. Model/catalog/runtime and reference-image files remain ignored and are not committed.

## Issues
Specific corrected bugs: #7 #8 #9 #10 #12. Product acceptance remains tracked by #1 #2 #3 #4 and the recognition blocker #11; do not close these from test counts alone.
