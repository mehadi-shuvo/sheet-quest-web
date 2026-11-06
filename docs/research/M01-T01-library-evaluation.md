# M01-T01 — Spreadsheet library evaluation

**Verification date:** 2026-11-06 (Asia/Dhaka)  
**Scope:** research and an isolated frontend feasibility spike only; no learner lesson flow, API contract, grading, persistence service, or paid package was added.

## Repository audit

- `sheetquest-web` is an independent Git repository: Next.js `15.5.29` at build time, React/React DOM `19.1.x`, TypeScript `5.9.x`, strict TypeScript, ESLint 9, and Node `>=22 <25`.
- The app uses the App Router. Before this task it had only a landing page, health route, and `/backend/*` same-origin gateway; it had no spreadsheet dependency, test runner, or browser-test tooling.
- Docker uses Node 22 Alpine, `npm ci`, a standalone Next build, and a non-root runtime. The deploy repository owns the Compose stack and canonical task tracker.
- Existing production routes were not modified. The proof lives only at `/spikes/univer` in a Client Component.

## Candidate comparison

| Candidate | Current package/version checked | UI/grid + keyboard/clipboard | Formula engine / required functions | Snapshot / import-export | Commercial SaaS license conclusion | Result |
| --- | --- | --- | --- | --- | --- | --- |
| **Univer core preset** | `@univerjs/presets` + `@univerjs/preset-sheets-core` `1.3.1` | Full browser sheet editor. Chromium verification covers selection, keyboard editing, single/multi-cell clipboard interactions, reset, refresh, and route remount. | Core preset calculated SUM, AVERAGE, IF, SUMIF, and a reference update in Chromium. Formula text and raw numeric results were read separately. | `FWorkbook.save()` plus safe replacement through `disposeUnit(id)` followed by `createWorkbook(snapshot)` round-tripped formulas, formatting, workbook ID, and sheet ID. CSV/XLSX exchange remains outside this scope. | **Approved for core only, subject to legal review.** Installed packages state Apache-2.0; Apache permits commercial use with license/NOTICE preservation. Do not assume Pro/Server/Exchange rights. | Recommended and browser-verified for the M01 feasibility scope. |
| **Handsontable** | `handsontable` `18.1.2` | Mature editable, virtualized data grid with React wrapper, keyboard navigation and clipboard-oriented grid behavior. Requires an evaluation or commercial key. | Formulas require a separately installed HyperFormula engine from v18 module usage. Its official docs show dependency recalculation through that plugin. | Supports grid data; spreadsheet workbook fidelity and XLSX round-trip are not an MVP-free assumption. Validate separately if licensed. | **Not approved.** Current commercial SaaS use requires a paid commercial license; the free key is for non-commercial/evaluation only. | Fallback only if budget approval and a license are obtained. |
| **HyperFormula** | `hyperformula` `3.5.0` | No spreadsheet UI, keyboard navigation, clipboard handling, or editor. | Headless dependency graph and roughly 400 Excel-compatible formulas according to vendor pricing documentation; SUM, AVERAGE, IF, SUMIF are in scope but were not installed or executed. | Can represent sheets and formulas but is not a visual workbook editor or XLSX importer/exporter. | **Not approved.** Package metadata is GPL-3.0-only; a closed-source subscription SaaS needs the vendor's commercial license. | Useful only as a licensed backend/client calculation engine paired with a separate grid—adds integration work and cost. |

## Technical evidence

### Univer

- The official React guide explicitly supports React 18 and 19 and prescribes initialization inside `useEffect`, a child DOM container, and disposal during cleanup. The proof follows that lifecycle.
- Installed `1.3.1` type declarations expose `FRange.setFormula()`, `FRange.getFormula()`, `FRange.getValue()`, `FWorkbook.save()`, and `FUniver.createWorkbook()`. This supports separating technique/formula text from displayed result and serializing a canonical workbook snapshot.
- The package’s installed dependency graph includes formula and sheets UI modules at exactly `1.3.1`. All `@univerjs/*` packages must remain on the same version.
- The current production build emits approximately **12 MB** of uncompressed JavaScript chunks in total; its largest individual chunk is approximately **1.1 MB**. The spike route entry is about **6.2 KB**, but this is not a compressed route-payload budget. A future lesson integration must lazy-load the editor and establish a compressed payload budget.
- Chromium/Playwright verification passed for formula calculation, numeric/raw-result separation, `0.00` display formatting, keyboard editing and navigation, single/multi-cell clipboard interactions, reset, native snapshot restore, page refresh, route unmount/remount, and invalid-formula handling (`#NAME?`). No page errors or duplicate-unit console errors were observed.

### Handsontable and HyperFormula

- Handsontable documents React support and separately documents that module users must install HyperFormula for the Formula plugin starting in v18.
- HyperFormula is headless: it cannot satisfy the product’s editable-workbook requirement by itself.
- Both require paid licensing for this commercial closed-source SaaS. Installing either would not respect the current limited budget or the no-paid-package instruction.

## Isolated proof

`src/app/spikes/univer/page.tsx` mounts `UniverSpreadsheetSpike` in a Client Component. It:

1. Uses stable workbook/sheet IDs and creates SUM, AVERAGE, IF, SUMIF, and reference formulas from native workbook data.
2. Waits for Univer's `Rendered` lifecycle stage, explicitly calculates, then waits for native formula results to be applied before reading them.
3. Reads formula text, raw AVERAGE value (`4.333333333333333`), and formatted AVERAGE display (`4.33`) independently.
4. Uses `FWorkbook.save()` for native snapshots. Restoration disposes the active unit before re-creating the snapshot with its retained ID, so it replaces rather than duplicates the workbook.
5. Guards state updates with a lifecycle/disposal flag and operation version, allowing Strict Mode cleanup, repeated reset/restore, refresh, and remount without stale async mutation.

`e2e/univer.spec.ts` verifies this in Playwright Chromium. No custom formula evaluator or hardcoded calculated strings were used.

## Licensing evidence and obligations

| Candidate | Exact license/package scope | SaaS conclusion | Obligations / unresolved items |
| --- | --- | --- | --- |
| Univer core preset | `@univerjs/presets@1.3.1`, `@univerjs/preset-sheets-core@1.3.1`; package metadata and upstream repository: Apache-2.0 | The Apache-licensed OSS core can be used in a commercial application. | Preserve Apache license and required NOTICE material in distributions; maintain a third-party-notice inventory. Commercial SDK plugins, server collaboration, and Exchange/file conversion are separately licensed and **not approved**. Legal review still required. |
| Handsontable | `handsontable@18.1.2`; npm declares a license file, vendor docs distinguish commercial vs non-commercial/evaluation keys | A subscription SaaS needs a paid commercial license. | Obtain written quote/terms and key before production. The non-commercial/evaluation key must not ship to paying or commercial users. |
| HyperFormula | `hyperformula@3.5.0`; npm metadata: GPL-3.0-only; vendor pricing: GPLv3 or commercial | GPLv3 is incompatible with this intended closed-source SaaS distribution unless the product is released under GPLv3; otherwise purchase commercial terms. | Do not install for production or ship it without a commercial license and legal review. |

This is engineering due diligence, not legal advice. License terms and product packaging must be rechecked at procurement and release time.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Univer API/version churn and large client bundle | High | Pin matching versions, keep an adapter boundary, lazy-load only the lesson editor, and enforce a route-size budget. |
| Spreadsheet bundle size and formula compatibility beyond the tested set | High | Keep Univer client-only/lazy-loaded, define a supported-function corpus, and enforce a compressed payload budget before lesson rollout. |
| Formula compatibility differs from Excel | High | Define a small supported-function contract, server-side validation corpus, and reject unsupported lesson features. |
| XLSX/CSV exchange may be Pro/Server functionality | Medium | Persist Univer snapshots for MVP; defer import/export until its exact product/license scope is approved. |
| Paid alternative/vendor lock-in | Medium | Do not install Handsontable/HyperFormula; retain a `WorkbookAdapter` boundary in M01-T05. |

## Recommendation and fallback

Use the **Apache-2.0 Univer core preset `1.3.1`** for M01-T02, behind the future `WorkbookAdapter`. It satisfies the feasibility spike's editable-workbook, formula, clipboard, and native-snapshot requirements without a paid dependency.

This is not approval for Pro/Server/Exchange packages, XLSX interchange, broad Excel parity, or a production lesson payload. If a later supported-function corpus or compressed bundle budget fails, seek budget and legal approval for Handsontable plus HyperFormula rather than shipping GPL/non-commercial alternatives.

## Official references

- [Univer React integration](https://docs.univer.ai/guides/sheets/getting-started/integrations/react)
- [Univer Sheets preset installation and basic usage](https://docs.univer.ai/guides/sheets/getting-started/installation)
- [Univer quickstart and snapshot model](https://docs.univer.ai/guides/sheets/getting-started/quickstart)
- [Univer Formula guide](https://docs.univer.ai/guides/sheets/features/core/formula)
- [Univer OSS repository and Apache-2.0 license](https://github.com/dream-num/univer)
- [Univer release history](https://github.com/dream-num/univer/releases)
- [Handsontable formula/HyperFormula installation](https://handsontable.com/docs/react-data-grid/formulas-installation/)
- [Handsontable license-key documentation](https://handsontable.com/docs/react-data-grid/license-key/)
- [Handsontable/HyperFormula pricing and license comparison](https://handsontable.com/pricing/?tab=hyperformula)
- [HyperFormula licensing/pricing](https://handsontable.com/pricing/?tab=hyperformula)

## Commands and actual results

- `npm view …` for all four package metadata entries → PASS; versions/licensing recorded above.
- `npm install @univerjs/presets@1.3.1 @univerjs/preset-sheets-core@1.3.1 --save-exact` → PASS; no paid package installed.
- `npm run lint` → PASS.
- `npm run typecheck` → PASS.
- `npm run build` → PASS; `/spikes/univer` generated as a route.
- `PORT=3001 npm run dev` plus `curl http://127.0.0.1:3001/spikes/univer` → PASS; route compiled and returned HTTP 200.
- `npm run test:e2e` (Chromium) → PASS when run as the two documented scenarios: formula/editor/clipboard/snapshot round trip and refresh/unmount/remount. It observed SUM `30`, AVERAGE raw `4.333333333333333` and display `4.33`, IF `Pass`, SUMIF `40`, G1 `15` → G2 `30`, and invalid-formula `#NAME?`; no duplicate-ID browser errors or uncaught page errors. The suite also covers repeated reset/restore operations.
- `npm run lint` → PASS after the lifecycle and test changes.
- `npm run typecheck` → PASS after the lifecycle and test changes.
- `npm run build` → PASS; optimized build generated the isolated spike route.
