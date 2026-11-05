import { UniverSpreadsheetSpike } from '@/features/spikes/univer/UniverSpreadsheetSpike';

export default function UniverSpikePage() {
  return (
    <main style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1.5rem' }}>
      <p style={{ color: '#6366f1', fontWeight: 700 }}>M01-T01 RESEARCH SPIKE</p>
      <h1>Univer spreadsheet feasibility proof</h1>
      <UniverSpreadsheetSpike />
    </main>
  );
}
