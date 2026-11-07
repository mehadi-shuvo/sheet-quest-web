# SheetQuest web

The web application is a separate repository. The canonical project roadmap, task board, and execution log live in the private deployment repository at `deploy/README.md` in the combined local checkout.

Before starting work, read that master roadmap in full. Record all task status and execution evidence there; do not create a competing roadmap in this repository.

## Univer feasibility spike

Run the isolated client-only spreadsheet proof at `/spikes/univer`:

```bash
npm run dev -- --port 3001
# Open http://127.0.0.1:3001/spikes/univer
```

The Chromium integration coverage starts its own development server and exercises formulas, editor interactions, clipboard, native snapshots, refresh, and remount:

```bash
npm run test:e2e
```

The reusable practice-editor demonstration is available at `/practice/demo`. It uses the Employee Bonus fixture; enter `=B2*10%` in C2, then use **Reset workbook** to restore the seed.

The formula compatibility workbook is available at `/practice/formulas`. Its documented, browser-verified MVP formula contract is in [docs/spreadsheet/formula-compatibility.md](docs/spreadsheet/formula-compatibility.md). It covers `SUM`, `AVERAGE`, `IF`, `SUMIF`, references, recalculation, reset, error observations, and formula-copy behavior; it does not claim general Excel compatibility.

The canonical snapshot demonstration is at `/practice/snapshots`. It exports/imports only schema-v1 JSON; see [workbook snapshot documentation](docs/spreadsheet/workbook-snapshot.md).
