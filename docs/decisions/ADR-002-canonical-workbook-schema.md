# ADR-002: Canonical workbook schema v1

- Status: Accepted for M01-T04
- Date: 2026-11-07

## Decision

Persist a small, application-owned, versioned JSON model instead of Univer's `IWorkbookData`. Schema v1 stores workbook identity/name, ordered sheets, dimensions, and address-keyed cells with primitive values, formulas, and number formats. It is validated before any editor mutation.

Univer snapshots contain engine/plugin state, calculated values, styles/resources, and implementation fields; therefore they are not a stable persistence contract. `univer-snapshot.codec.ts` is the only module that maps the supported subset between native data and canonical data.

## Consequences

The supported contract is deliberately limited to multi-sheet order/names, primitive values including explicit `null`, formulas, and number formats. Merges, dimensions beyond sheet bounds, general styles, hidden rows/columns, named ranges, validation, conditional formats, charts, images, external references, and plugin metadata are not preserved. Native-to-canonical export omits them; imported canonical JSON cannot introduce them.

Schema versions other than `1`, unexpected fields, unsafe keys, invalid addresses, oversized payloads, duplicate sheet IDs/names, and unsupported value types are rejected. A future migration must parse its old version explicitly rather than silently reinterpret it. M01-T05 may wrap this service behind the planned `WorkbookAdapter`; it must not expose native snapshots to lesson UI.
