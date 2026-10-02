# Cable Street map authoring

This folder is the historical-map handoff for the first playable Cable Street slice.

It is intentionally **not** a production game map yet.

## Current gate state

- MAP-01: research boundary frozen around the Christian Street vicinity.
- MAP-02: evidence register stored.
- MAP-03: calibration/tracing pipeline ready, but no real image control points or traced production features have been entered.
- MAP-04: mixed-date reconciliation ledger exists but is pending feature decisions.
- MAP-05: event-overlay layer exists but is pending supported area geometry.
- MAP-06: contradiction-review checklist exists but is pending review.
- SLICE-01 transform/compiler exists, but the runtime projection is intentionally not ready.

`historical-missions.js` must remain `playable:false` and `mapReady:false` until the later slice/release gates pass.

## Files

- `first-slice-boundary.json` - named research boundary and explicit exclusions.
- `evidence-register.json` - S01-S06 source ledger and unresolved research.
- `authoring-schema.json` - feature attributes, layers and confidence labels.
- `calibration.json` - real source-image control/check points and fitted transform.
- `trace.geojson` - calibrated authoring geometry in EPSG:27700; currently empty.
- `reconciliation.json` - per-feature 1916/1937/1936 reconciliation decisions.
- `event-overlay.geojson` - approximate event-location areas, kept separate from surveyed geometry.
- `historical-review.json` - contradiction/anachronism review.
- `uncertainty-log.json` - feature/navigation/provenance uncertainty with explicit blocking status.
- `runtime-projection.json` - separate EPSG:27700-to-runtime projection used only after the trace is approved.
- `runtime-objects.json` - SLICE-02 barricade, material, rescue and police placements; deliberately empty until the map is approved.

## Calibration workflow

1. Work from the approved source crop, not from a schematic event map.
2. Record at least three well-separated image/grid controls in `calibration.json`.
3. Retain at least one additional grid intersection as an independent check.
4. Run:

```bash
npm run cable:calibrate
```

5. Review the reported control and check residuals. Record the measured error; do not invent a precision target.
6. Keep the image-to-grid transform separate from later game scale/origin.

A control point uses:

```json
{
  "id": "grid-control-1",
  "image": [1234.5, 678.0],
  "grid": [534500, 180900]
}
```

Image coordinates are pixels in the recorded source crop. Grid coordinates are EPSG:27700 metres.

## Trace workflow

Trace separate layers for:

- carriageway edges;
- building envelopes;
- railway geometry;
- event-location areas;
- gameplay adjustments.

Every feature must preserve the fields in `authoring-schema.json`, including source IDs, source date, confidence, interpretation note and gameplay adjustment.

Use only these confidence labels:

- directly depicted;
- corroborated;
- inferred;
- fictional gameplay.

Do not turn an approximate barricade vicinity into a false precise point.

Do not make an essential objective depend on an unverified courtyard, alley or passage.

## Readiness checks

Run:

```bash
npm run cable:authoring:check
```

This checks that the current research package is internally valid.

Run:

```bash
npm run cable:authoring:require-ready
```

only when testing whether all MAP-01 to MAP-06 gates are ready. It is expected to fail at the current stage.

The synthetic Cable Street fixtures under `tests/fixtures` remain mechanics/navigation tests only and must never be copied into this production trace.


## Reconciliation and release workflow

After MAP-03 has real traced features:

1. Add one reconciliation decision for every feature where `affectsMovement:true`.
2. Record source-geometry confidence separately from 1936 event-date confidence.
3. Do not use an inferred/uncertain passage as an essential route unless the decision explicitly records it as a fictional gameplay adaptation.
4. Add supported event areas to `event-overlay.geojson`; keep approximate locations as Polygon/MultiPolygon geometry rather than false precise points.
5. Resolve or explicitly accept every blocking entry in `uncertainty-log.json`.
6. Complete every blocking check in `historical-review.json` and record remaining non-blocking uncertainty.
7. Only then set `runtime-projection.json` to `status:"ready"` with a top-left BNG origin and positive `metresPerMapUnit`.

The guarded compiler is:

```bash
npm run cable:compile-map
```

It is expected to fail against the current authoring package. That failure is intentional until MAP-01 through MAP-06 and the separate runtime projection are ready.

## SLICE-02 object placement

`runtime-objects.json` is the handoff from the approved historical map into the interaction runtime. Production positions stay in EPSG:27700 and are projected by the same runtime projection as the street geometry.

The first playable slice requires:

- 1 main barricade;
- timber, crates and furniture material loads;
- 1 rescue interaction;
- 1 police formation.

Keep `status:"awaiting-approved-map"` and all object arrays empty until the production map gates are approved. Synthetic fixture coordinates must never be copied into this file. When the placement record is eventually set to `status:"ready"`, the compiler validates object IDs, supported material types, barricade references and required counts before emitting `historicalObjects` for `cable-street-interactions.js`.
