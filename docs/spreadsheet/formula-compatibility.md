# Formula compatibility baseline

## Scope and environment

This is an evidence-backed MVP baseline for the native Univer editor. It is not a claim of broad Excel compatibility.

- Univer packages: `@univerjs/presets@1.3.1` and `@univerjs/preset-sheets-core@1.3.1`
- Application: Next.js `15.5.29`, React `19.1.x`, TypeScript strict mode
- Browser: Playwright Chromium (`@playwright/test@1.65.x`) on Linux, Node `22.23.4`
- Workbook: the isolated `formula-compatibility-workbook` fixture at `/practice/formulas`
- Calculation lifecycle: wait for Univer `Rendered` with a 5-second deadline, call `executeCalculation()`, then await `onCalculationResultApplied(5000)` before declaring a formula-bearing workbook ready. A reset first settles the active formula workbook, disposes the unit, recreates its native snapshot, and waits for the replacement calculation before making it editable.

The typed fixture in `src/features/spreadsheet/fixtures/formula-test-cases.ts` is the single source for source cells, formulas, expected values, display formatting, and recalculation inputs. The browser suite uses the actual canvas, formula-bar edit mode, and clipboard; it does not mock a calculation engine.

## Supported formula matrix

| Feature | Expected | Actual Chromium result | Status |
| --- | --- | --- | --- |
| `SUM(A1:A2)` | `30` | `30` | VERIFIED |
| `AVERAGE(B1:B3)` raw value | approximately `4.333333333333333` | Native `getRawValue()` evidence remains numeric and matches `13 / 3` to 10 decimals in the M01-T01 regression; unformatted grid display is `4.33333333333` | VERIFIED |
| `AVERAGE(B1:B3)` formatted | `4.33` with `0.00` | `4.33`; raw value remains numeric | VERIFIED |
| `IF(C1>=40,"Pass","Fail")` | `Pass`, then `Fail` after `C1=30` | `Pass`, then `Fail` | VERIFIED |
| `SUMIF(D1:D3,"A",E1:E3)` | `40`, then `60` after `E3=50` | `40`, then `60` | VERIFIED |
| Direct reference `=G1*2` | `20`, then `30` after `G1=15` | `20`, then `30` | VERIFIED |
| Nested `IF(SUM(...))` | `High`, then `Low` after `H2=5` | `High`, then `Low` | VERIFIED |
| Blank cell in `SUM` | `10` | `10` | VERIFIED |
| Negative/decimal `SUM` | `-5.25` | `-5.25` | VERIFIED |
| Formula string preservation | each entered formula retained | Verified through real F2/formula-bar copy for seeded and copied formulas | VERIFIED |
| Reset with formulas | original formula results restored | `Pass`, `40`, `20`, and `High` restored after edits | VERIFIED |

The grid’s unformatted display precision is presentation behavior, not a request to round formula output. Tests keep formatted display and raw numeric evidence distinct.

## Reference and copy behavior

| Case | Source formula | Copied formula/result | Status |
| --- | --- | --- | --- |
| Relative | `N1 = M1*2` | `N2 = M2*2`, result `40` | VERIFIED |
| Absolute | `O1 = $M$1*2` | `O2 = $M$1*2`, result `20` | VERIFIED |
| Mixed column | `P1 = $M1*2` | `P2 = $M2*2`, result `40` | VERIFIED |
| Mixed row | `Q1 = M$1*2` | `Q2 = M$1*2`, result `20` | VERIFIED |

These assertions inspect raw formula strings while the actual spreadsheet is in formula-bar edit mode. They do not infer translation only from the computed value.

## Error handling observations

| Scenario | Raw formula | Observed result | Status |
| --- | --- | --- | --- |
| Unknown function | `=UNKNOWN_FUNCTION(1)` | `#NAME?` | VERIFIED |
| Divide by zero | `=1/0` | `#DIV/0!` | VERIFIED |
| Seeded malformed formula | `=SUM(` | `#VALUE!` | VERIFIED |
| Explicit invalid-reference token | `=#REF!` | `#REF!` | VERIFIED |
| Circular pair | `L1 = L2`, `L2 = L1` | both cells display `0`; the editor remains usable and an unrelated reference recalculates | PARTIALLY VERIFIED |

Circular references are not endorsed as supported semantics: this records only the observed Univer 1.3.1 behavior. No infinite loading, editor error state, duplicate-unit error, or uncaught browser error was observed in the automated circular-reference scenario.

## Limitations and MVP recommendation

The recommended MVP contract is the verified matrix above: arithmetic, direct/range references, `SUM`, `AVERAGE`, `IF`, `SUMIF`, ordinary relative/absolute/mixed reference translation, reset, and the recorded error display behavior.

The following are **NOT TESTED** and must not be advertised as compatible: dynamic arrays, spilled ranges, named ranges, structured references, lookup families, date/time semantics, financial/statistical functions beyond this matrix, locale-specific parsing, external links, macros, collaboration, XLSX import/export, and cross-browser behavior outside Chromium. Circular references are **PARTIALLY VERIFIED**, not a supported lesson feature. The current test does not model deleted-reference propagation; it verifies only Univer’s handling of an explicit `#REF!` token.

The M01-T02 bundle concern remains: the dynamically imported Univer editor chunk measured about 41.6 MB uncompressed. Formula coverage does not change that release-risk assessment.

## Reproduction

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/spreadsheet-formulas.spec.ts --reporter=line
npm run test:e2e
```

For manual inspection, run `npm run dev -- --port 3002` and open `http://127.0.0.1:3002/practice/formulas`.

## Performance observation

On a warmed local development server, a headless Chromium visit reached `spreadsheet-editor-ready` in approximately **2.48 s**. An edit of `G1` followed by a clipboard-verified update of `G2` took approximately **340 ms** end-to-end; this includes browser keyboard/selection/clipboard overhead and is not a pure engine benchmark. The small fixture contains the baseline formulas and error cases above. Establish a compressed production payload budget and production-route performance budget before release.
