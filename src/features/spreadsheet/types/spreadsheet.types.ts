export type SpreadsheetCellValue = string | number | boolean | null;

export type SpreadsheetCell = {
  f?: string;
  s?: { n?: { pattern: string } };
  v?: SpreadsheetCellValue;
};

export type WorkbookSeed = {
  id: string;
  name: string;
  sheetOrder: string[];
  sheets: Record<
    string,
    {
      cellData?: Record<number, Record<number, SpreadsheetCell>>;
      columnCount: number;
      id: string;
      name: string;
      rowCount: number;
    }
  >;
};

export type SpreadsheetExercise = {
  id: string;
  instructions: string;
  title: string;
  workbook: WorkbookSeed;
};

export type SpreadsheetEditorProps = {
  className?: string;
  initialWorkbook: WorkbookSeed;
  onError?: (error: Error) => void;
  onReady?: () => void;
  readOnly?: boolean;
  resetRequest?: number;
};
