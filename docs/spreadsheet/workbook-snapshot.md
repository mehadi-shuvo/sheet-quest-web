# Canonical workbook snapshot

`/practice/snapshots` exports/imports application-owned canonical JSON, never raw Univer data.

```json
{"id":"workbook-id","name":"Practice","schemaVersion":1,"sheets":[{"id":"sheet-id","name":"Sheet 1","rowCount":100,"columnCount":20,"cells":{"A1":{"value":"Label"},"B1":{"formula":"=A1*2","numberFormat":"0.00"}}}]}
```

Cells are address-keyed (`A1`); a missing key means no stored cell, while `{ "value": null }` is an explicit blank value. Formula strings are authoritative and must start with `=`; cached calculated values are omitted. Serialization is deterministic: sheet order is retained and cell addresses are sorted row/column.

Imports are limited to 1 MB JSON, 32 sheets, 10,000 populated cells, 1,000 rows, 100 columns, 8,192 formula characters, and 32,768 string characters. Invalid JSON/schema/version/addresses/value types or unexpected fields are rejected before a workbook is disposed. If native candidate creation fails after disposal, the prior saved native snapshot is recreated; this is rollback for replacement failure, not a claim of transactional persistence.

Supported: sheet order/names, primitives, explicit nulls, formulas/references, and number formats. Not preserved: merges, row/column sizing or hiding, styles beyond number formats, names, validation, conditional formatting, charts, images, external references, and plugin metadata.

## Verification and performance

`npm run test` runs nine fast domain/codec tests. The Chromium snapshot test verifies two consecutive imports, formula text and recalculation, formatted display, reset/refresh, and rejection of malformed JSON, unsupported versions, invalid addresses, and oversized input without changing the active workbook or leaving it busy.

On the local single-worker Chromium run on 2026-11-07, the small fixture serialized to **471 bytes**. Two valid imports completed in **456 ms** end-to-end, including browser interaction and readiness waits; this is not a pure Univer benchmark. Reproduce with `npx playwright test e2e/spreadsheet-snapshots.spec.ts --workers=1 --reporter=line`.
