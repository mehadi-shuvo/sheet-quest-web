import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'SheetQuest', description: 'Practice spreadsheets with real-world exercises' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body style={{fontFamily:'system-ui, sans-serif',margin:0}}>{children}</body></html>;
}
