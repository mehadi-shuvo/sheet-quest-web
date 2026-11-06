# ADR-001: Spreadsheet library for the MVP editor

- **Status:** ACCEPTED FOR M01
- **Date:** 2026-11-06

## Context

SheetQuest needs a browser spreadsheet editor for formula practice, reset, formula-aware grading, and save/resume. It is a closed-source commercial SaaS with a limited budget and a 45-day MVP deadline. The frontend is Next.js 15 with React 19. Formula technique must be observable separately from a calculated value.

## Decision Drivers

1. Editable, keyboard-oriented spreadsheet UI in a Next.js client component.
2. SUM, AVERAGE, IF, SUMIF, references, and recalculation.
3. Formula text and computed value both accessible to a trusted evaluator.
4. JSON snapshot persistence with formula preservation.
5. Legally usable in a closed-source subscription SaaS with minimal cost.
6. Isolated/lazy-loaded integration to limit route payload and vendor coupling.

## Considered Options

| Option | Assessment |
| --- | --- |
| Univer core `1.3.1` | Full embedded spreadsheet model/editor and snapshot API; Apache-2.0 OSS core. Browser proof has passed; bundle size and supported-function scope remain release gates. |
| Handsontable `18.1.2` + HyperFormula | Technically strong grid/engine pairing but requires commercial licensing for production SaaS; not viable for the current budget without approval. |
| HyperFormula `3.5.0` alone | Formula engine only; no editable grid. GPLv3 package is incompatible with this closed-source SaaS absent commercial licensing. |

## Technical Evidence

An isolated `/spikes/univer` Client Component compiles in Next.js 15/React 19. It waits for Univer's `Rendered` lifecycle stage before triggering calculation, waits for native formula results, reads formula text separately from raw values and display values, and saves/replaces native snapshots.

The replacement rule is explicit: `FWorkbook.save()` retains the unit ID, so the active unit must be removed with `univerAPI.disposeUnit(id)` before `createWorkbook(snapshot)`. This prevents the confirmed duplicate-unit exception. React cleanup sets a disposal guard before immediately disposing the Univer instance, and operation versions prevent async work from publishing after replacement or unmount.

Playwright Chromium passed SUM (`30`), AVERAGE (raw `4.333333333333333`, display `4.33`), IF (`Pass`), SUMIF (`40`), reference recalculation (`G1=15` gives `G2=30`), invalid-formula handling (`#NAME?`), keyboard editing/navigation, single/multi-cell clipboard interactions, repeated reset/restore, refresh, and route unmount/remount. No uncaught page errors or duplicate-unit errors were observed. Lint, strict type checking, and the production build pass.

## Licensing Evidence

The installed Univer core packages declare Apache-2.0 and the upstream repository states its OSS SDK may be used commercially under Apache-2.0. Preserve applicable notices. Pro/Server/Exchange functionality is outside this approval.

Handsontable’s official licensing documentation says commercial use requires a commercial key. HyperFormula is GPLv3 or commercial; its current npm package metadata is GPL-3.0-only. Neither paid path is approved for this project now.

## Decision

**Accept Univer core preset `1.3.1` for M01 feasibility work and proceed to M01-T02.** Keep all Univer access behind the future `WorkbookAdapter` identified by M01-T05. Do not add Univer Pro, Server SDK, Exchange, Handsontable, or HyperFormula as a production dependency without a separate license decision.

## Consequences

- The current web repository includes two pinned Apache-licensed Univer packages and an isolated spike route.
- The first real lesson editor must be client-only and lazy-loaded; the current optimized build contains roughly 12 MB of uncompressed JavaScript chunks, so compressed lesson-route size needs a defined budget.
- MVP persistence should store a validated, size-limited workbook snapshot, not XLSX files.
- Server-side grading still requires a trusted evaluator; client output is never authoritative.

## Risks

- The optimized build is still too large to treat as production-ready without a compressed lesson-route budget.
- Core formula compatibility may differ from Excel.
- The tested spreadsheet interactions are limited to Chromium and the listed formula set; expand the compatibility corpus and cross-browser matrix before release.
- Pro/Server packages could create unplanned spend or lock-in.

## Fallback Strategy

If a browser proof shows Univer cannot meet the required formula/editor/size criteria, pause M01 and request explicit budget and legal approval for Handsontable plus HyperFormula commercial licenses. Do not fall back to GPLv3 or non-commercial keys in a production SaaS.

## Revisit Conditions

- Browser proof fails SUM, AVERAGE, IF, SUMIF, recalculation, snapshot restoration, editing, clipboard, or unmount/remount.
- Measured lazy-loaded editor payload exceeds an agreed performance budget.
- The MVP needs XLSX import/export, collaboration, charts, pivots, or other feature areas that may be Pro/Server only.
- Univer changes licensing, package boundaries, supported browser baseline, or a breaking major version.

## References

- [M01-T01 research evaluation](../research/M01-T01-library-evaluation.md)
- [Univer React integration](https://docs.univer.ai/guides/sheets/getting-started/integrations/react)
- [Univer OSS license](https://github.com/dream-num/univer)
- [Handsontable formula integration](https://handsontable.com/docs/react-data-grid/formulas-installation/)
- [Handsontable/HyperFormula licensing](https://handsontable.com/pricing/?tab=hyperformula)
