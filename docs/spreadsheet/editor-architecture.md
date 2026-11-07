# Reusable spreadsheet editor architecture

## Scope

`src/features/spreadsheet` is the client-only editor module used by practice routes. It supports an editable native Univer workbook, reset to a supplied seed, error states, and an exercise-oriented workspace. It does not grade work, persist snapshots, or provide the future `WorkbookAdapter`.

## Module layout

```text
features/spreadsheet/
├── components/
│   ├── SpreadsheetEditor.tsx        # editor host, readiness and async error UI
│   ├── SpreadsheetWorkspace.tsx     # exercise title, instructions and editor composition
│   ├── SpreadsheetToolbar.tsx       # confirmed reset control
│   └── SpreadsheetErrorBoundary.tsx # render-time fallback only
├── fixtures/
│   ├── employee-bonus.fixture.ts
│   └── formula-test-cases.ts       # typed formula corpus and derived native seed
├── hooks/useSpreadsheetEditor.ts    # React lifecycle and reset state
├── lib/univer/
│   ├── create-univer.ts             # Univer-only initialization and CSS
│   ├── workbook-lifecycle.ts        # runtime ownership, render/calculation waiting, disposal
│   └── workbook-operations.ts       # native workbook replacement operations
├── types/
│   ├── formula-test.types.ts        # formula expectations and recalculation contracts
│   └── spreadsheet.types.ts         # public seed and component contracts
└── utils/spreadsheet-errors.ts
```

Practice pages import `SpreadsheetWorkspace` and a typed fixture from the feature barrel. They do not import Univer packages. `SpreadsheetWorkspace` dynamically imports `SpreadsheetEditor` with SSR disabled, so Univer is never executed during server rendering and unrelated routes do not load it.

## Public API

```ts
type SpreadsheetEditorProps = {
  initialWorkbook: WorkbookSeed;
  readOnly?: boolean;
  className?: string;
  resetRequest?: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
};
```

`WorkbookSeed` is a deliberately small, typed representation of the currently supported native Univer sheet data. It is cloned before handing data to Univer, so fixtures are never mutated. Changing `initialWorkbook` identity is an intentional full editor replacement; callback identity changes do not recreate the editor. `resetRequest` increments when a parent intentionally asks the mounted editor to restore its original seed.

## Lifecycle and reset

1. The hook creates a private container and one Univer instance for a component mount.
2. It creates exactly one workbook using a cloned seed, snapshots the initial state, and waits for Univer's `Rendered` lifecycle stage with a five-second deadline before reporting readiness. Formula-bearing seeds additionally trigger calculation and await native result application.
3. Every formula reset first settles the active calculation, then increments an operation version, disposes the active unit, and creates the original native snapshot. Native snapshots retain IDs, so disposal before recreation is required.
4. Formula-bearing replacements wait for calculation before becoming editable; all async work checks the operation version and disposal flag before updating React state.
5. Unmount marks the runtime disposed before disposing Univer and removing the private container.

This preserves the M01-T01 Strict Mode and duplicate-unit protections. Reset deliberately discards edits after a confirmation because user-edit persistence is outside M01-T02.

## Error handling

Initialization and reset errors are handled in the hook, reported through `onError`, and displayed without stack traces. The error boundary handles only render-time React exceptions; it does not pretend to catch asynchronous Univer failures. A reset failure remains visible rather than being swallowed.

## Testing

```bash
npm run test:e2e
```

`e2e/spreadsheet-editor.spec.ts` runs the practice demo in real Chromium and covers initial content, selection, numeric/formula entry, recalculation, keyboard navigation, single/multi-cell clipboard, reset, refresh, navigation, and browser errors. `e2e/spreadsheet-formulas.spec.ts` runs the typed formula corpus through the actual Univer canvas, formula bar, and clipboard, covering required calculations, dependency updates, reset, raw formula preservation, reference translation, and observed errors. The M01-T01 spike tests remain in `e2e/univer.spec.ts`; [formula compatibility](formula-compatibility.md) defines the bounded supported contract.

## Performance and limitations

In the M01-T02 production build, the practice-route entry is approximately **128 KB** uncompressed and the dynamically imported editor chunk is approximately **41.6 MB**; all emitted JavaScript chunks total approximately **114 MB** uncompressed. Chromium readiness measured from a warm development reload to `spreadsheet-editor-ready` was approximately **2.26 seconds**. A first development visit was approximately **10.0 seconds**, including Next development compilation, so it is not a runtime baseline. The editor remains client-only and dynamically imported, but compressed production transfer size must be measured and budgeted before rollout.

Only the tested Univer core feature set is supported. XLSX exchange, collaboration, server-side validation, persistence, broad Excel parity, and `WorkbookAdapter` are intentionally deferred. M01-T05 should introduce the adapter at the `SpreadsheetEditor`/seed boundary rather than exposing Univer APIs to lesson UI.
