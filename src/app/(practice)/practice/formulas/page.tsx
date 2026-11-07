import { SpreadsheetWorkspace, formulaTestFixture } from '@/features/spreadsheet';

export default function FormulaCompatibilityPage() {
  return (
    <main style={{ margin: '2rem auto', maxWidth: 1200, padding: '0 1.5rem' }}>
      <SpreadsheetWorkspace
        exercise={{
          id: 'formula-compatibility',
          title: 'Formula compatibility workbook',
          instructions: 'This internal workbook exercises the supported formula compatibility set.',
          workbook: formulaTestFixture.workbook,
        }}
      />
    </main>
  );
}
