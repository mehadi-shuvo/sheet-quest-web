import { describe, expect, it } from 'vitest';
import { WORKBOOK_CAPABILITIES } from './workbook-capabilities';
import { WorkbookAdapterError } from './workbook-adapter.types';

describe('workbook adapter contract', () => {
  it('keeps adapter errors typed and preserves underlying causes', () => {
    const cause = new Error('native failure');
    const error = new WorkbookAdapterError('IMPORT_FAILED', 'Import failed.', cause);
    expect(error.code).toBe('IMPORT_FAILED');
    expect(error.cause).toBe(cause);
  });

  it('publishes the bounded verified capability contract', () => {
    expect(WORKBOOK_CAPABILITIES.formulas).toBe('VERIFIED');
    expect(WORKBOOK_CAPABILITIES.canonicalSnapshots).toBe('VERIFIED');
    expect(WORKBOOK_CAPABILITIES.xlsxImportExport).toBe('UNSUPPORTED');
    expect(WORKBOOK_CAPABILITIES.largeWorkbooks).toBe('NOT_TESTED');
  });
});
