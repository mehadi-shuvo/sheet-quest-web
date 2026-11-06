import { SpreadsheetWorkspace, employeeBonusExercise } from '@/features/spreadsheet';

export default function PracticeDemoPage() {
  return (
    <main style={{ margin: '2rem auto', maxWidth: 1200, padding: '0 1.5rem' }}>
      <SpreadsheetWorkspace exercise={employeeBonusExercise} />
    </main>
  );
}
