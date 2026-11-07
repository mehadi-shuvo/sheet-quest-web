import { SpreadsheetWorkspace, snapshotExercise } from '@/features/spreadsheet';

export default function SnapshotPracticePage() {
  return (
    <main style={{ margin: '2rem auto', maxWidth: 1200, padding: '0 1.5rem' }}>
      <SpreadsheetWorkspace enableSnapshots exercise={snapshotExercise} />
    </main>
  );
}
