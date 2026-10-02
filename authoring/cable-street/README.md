# Cable Street map authoring

This folder is the historical-map handoff for the first playable Cable Street slice.

It is intentionally **not** a production game map yet.

## Current gate state

- MAP-01: research boundary frozen around the Christian Street vicinity.
- MAP-02: evidence register stored.
- MAP-03: calibration/tracing pipeline ready, but no real image control points or traced production features have been entered.
- MAP-04 to MAP-06: pending reconciliation, event overlay and contradiction review.

`historical-missions.js` must remain `playable:false` and `mapReady:false` until the later slice/release gates pass.

## Files

- `first-slice-boundary.json` - named research boundary and explicit exclusions.
- `evidence-register.json` - S01-S06 source ledger and unresolved research.
- `authoring-schema.json` - feature attributes, layers and confidence labels.
- `calibration.json` - real source-image control/check points and fitted transform.
- `trace.geojson` - calibrated authoring geometry in EPSG:27700; currently empty.

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
