# ADR-001: Spreadsheet library for the MVP editor

- **Status:** PROPOSED
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
| Univer core `1.3.1` | Full embedded spreadsheet model/editor and snapshot API; Apache-2.0 OSS core. Large bundle and browser proof still required. |
| Handsontable `18.1.2` + HyperFormula | Technically strong grid/engine pairing but requires commercial licensing for production SaaS; not viable for the current budget without approval. |
| HyperFormula `3.5.0` alone | Formula engine only; no editable grid. GPLv3 package is incompatible with this closed-source SaaS absent commercial licensing. |

## Technical Evidence

An isolated `/spikes/univer` Client Component compiles in Next.js 15/React 19. It initializes the Univer core preset using the official React lifecycle, creates cells/formulas, uses `getFormula()` and `getValue()`, serializes `FWorkbook.save()`, recreates a workbook from that snapshot, and disposes on cleanup.

Lint, typecheck, production build, and route-serving smoke tests pass. A real browser did not execute the spike, so calculation values, editing, keyboard navigation, clipboard, cleanup, and restore must remain unverified.

## Licensing Evidence

The installed Univer core packages declare Apache-2.0 and the upstream repository states its OSS SDK may be used commercially under Apache-2.0. Preserve applicable notices. Pro/Server/Exchange functionality is outside this approval.

Handsontable’s official licensing documentation says commercial use requires a commercial key. HyperFormula is GPLv3 or commercial; its current npm package metadata is GPL-3.0-only. Neither paid path is approved for this project now.

## Decision

**Propose Univer core preset `1.3.1` as the M01 spike candidate only.** Keep all Univer access behind the future `WorkbookAdapter` identified by M01-T05. Do not add Univer Pro, Server SDK, Exchange, Handsontable, or HyperFormula as a production dependency without a separate license decision.

## Consequences

- The current web repository includes two pinned Apache-licensed Univer packages and an isolated spike route.
- The first real lesson editor must be client-only and lazy-loaded; it must not inflate marketing pages.
- MVP persistence should store a validated, size-limited workbook snapshot, not XLSX files.
- Server-side grading still requires a trusted evaluator; client output is never authoritative.

## Risks

- The observed spike route output is very large before compression; package splitting/lazy loading must be measured.
- Core formula compatibility may differ from Excel.
- Clipboard, browser cleanup, and formula timing are unproven without automation.
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
