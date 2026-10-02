# Cable Street map authoring

The first playable slice is a bounded reconstruction of the Christian Street defence on Cable Street. The production map is generated from this package; synthetic mechanics fixtures remain separate.

## Evidence and limits

The baseline is the 1916 County Series map reproduced on PDF page 154 of the [Cable Street technical report](https://www.london.gov.uk/sites/default/files/cablestreet-technical.pdf). The upper 1937 aerial on page 345 was inspected for the street/railway relationship. This is a small playable interpretation, not an exact reconstruction of every 1936 building or event.

`calibration.json` records three grid controls from a 2400 × 1697 whole-page render and one independent check. The check residual is approximately 0.216 m; manual pixel selection remains approximate and that residual does not measure historical accuracy. `source-digitisation.json` retains the raw image coordinates. `trace.geojson` stores their calibrated EPSG:27700 geometry. Terrace frontages are simplified, with inferred subdivisions and rear depths. Private yards, the coal depot and crop limits are explicit fictional gameplay closures.

The barricade is placed inside an approximate event-vicinity polygon. Its exact historical coordinate remains unknown. Essential navigation stays on the public street corridor and does not depend on an unverified alley or private passage.

## Current release state

- Calibration, trace, per-feature reconciliation and contradiction review are populated.
- Blocking uncertainties have explicit accepted resolutions; remaining provenance uncertainty is retained.
- The runtime projection is configured with a separate origin and `metresToWorldUnits` scale.
- Runtime placement includes four volunteers, one barricade, timber/crates/furniture, a resident evacuation, a police formation and a regroup point.
- The release verifier checks object counts, placement, material/resident accessibility, evacuation, defender retreat, support access, barricade separation and the full-width police approach/withdrawal corridors.
- `historical-missions.js` enables the bounded slice only when the generated map is present and ready.

## Files

- `first-slice-boundary.json`: research boundary and exclusions.
- `evidence-register.json`: source ledger and remaining research.
- `authoring-schema.json`: feature attributes and confidence labels.
- `calibration.json`, `source-digitisation.json`, `trace.geojson`: calibration and simplified source geometry.
- `reconciliation.json`, `historical-review.json`, `uncertainty-log.json`: decisions, checks and uncertainty.
- `event-overlay.geojson`: approximate event areas, separate from surveyed geometry.
- `runtime-projection.json`, `runtime-objects.json`: game projection and fictional scenario placements.

## Rebuild and verification

```bash
npm run cable:calibrate
npm run cable:authoring:require-ready
npm run cable:verify-release
npm run cable:build-runtime-map
npm test
```

After changing geometry or placements, rebuild `cable-street-map.js` and retain the source confidence, reconciliation decision and uncertainty record. The builder runs release verification before writing the runtime map. Pending/empty authoring fixtures continue to verify that incomplete packages cannot pass these gates.

The production playthrough test covers every phase, the full four-minute final hold, navigation, actual evacuation, collision recovery after a breach, failure, restart and cleanup. Physical phone/browser checks remain in `PLAYTEST.md`.
