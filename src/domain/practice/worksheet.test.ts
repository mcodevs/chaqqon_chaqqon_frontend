import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import {
  DEFAULT_WORKSHEET_BRAND,
  DEFAULT_WORKSHEET_CONFIG,
  type WorksheetConfig,
  WORKSHEET_LIMITS,
  buildWorksheet,
  columnHeadings,
  normalizeWorksheetConfig,
  rowCountForTable,
  tableLabel,
  worksheetBrandFor,
} from './worksheet';

const config = (overrides: Partial<WorksheetConfig> = {}): WorksheetConfig => ({
  ...DEFAULT_WORKSHEET_CONFIG,
  ...overrides,
});

describe('columnHeadings', () => {
  it('letters the columns A…J', () => {
    expect(columnHeadings('letters', 10)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });

  it('numbers the columns from one', () => {
    expect(columnHeadings('numbers', 4)).toEqual(['1', '2', '3', '4']);
  });
});

describe('tableLabel', () => {
  it('names the tables with roman numerals', () => {
    expect([0, 1, 2].map(tableLabel)).toEqual(['I', 'II', 'III']);
  });
});

describe('normalizeWorksheetConfig', () => {
  it('falls back to the defaults for anything unreadable', () => {
    expect(normalizeWorksheetConfig(null)).toEqual(DEFAULT_WORKSHEET_CONFIG);
    expect(normalizeWorksheetConfig({ section: 'xyz', layout: 'spiral' })).toEqual(DEFAULT_WORKSHEET_CONFIG);
  });

  it('clamps the counts into their limits', () => {
    const normalized = normalizeWorksheetConfig({ columnCount: 99, sheetCount: 0, rowCount: 4.4 });
    expect(normalized.columnCount).toBe(WORKSHEET_LIMITS.columnCount.max);
    expect(normalized.sheetCount).toBe(WORKSHEET_LIMITS.sheetCount.min);
    expect(normalized.rowCount).toBe(4);
  });

  it('drops a topic that does not exist', () => {
    expect(normalizeWorksheetConfig({ topicId: 'yoq' }).topicId).toBeUndefined();
  });

  it('takes the section and the shortest problem from the chosen topic', () => {
    const normalized = normalizeWorksheetConfig({ topicId: 'kichik+4', section: 'miks', rowCount: 2 });
    expect(normalized.topicId).toBe('kichik+4');
    expect(normalized.section).toBe('kichik');
    expect(normalized.rowCount).toBeGreaterThanOrEqual(3);
  });
});

describe('rowCountForTable', () => {
  it('keeps every table the same length when the rows do not grow', () => {
    const fixed = config({ growRows: false, rowCount: 5 });
    expect([0, 1, 2].map((i) => rowCountForTable(fixed, i))).toEqual([5, 5, 5]);
  });

  it('adds a row per table when they do', () => {
    const growing = config({ growRows: true, rowCount: 5 });
    expect([0, 1, 2].map((i) => rowCountForTable(growing, i))).toEqual([5, 6, 7]);
  });

  it('never grows past the longest problem allowed', () => {
    const growing = config({ growRows: true, rowCount: WORKSHEET_LIMITS.rowCount.max });
    expect(rowCountForTable(growing, 3)).toBe(WORKSHEET_LIMITS.rowCount.max);
  });
});

describe('buildWorksheet', () => {
  it('builds every sheet, table and column that was asked for', () => {
    const worksheet = buildWorksheet(
      config({ sheetCount: 2, tableCount: 3, columnCount: 6, growRows: false }),
      createSeededRandom(7),
    );

    expect(worksheet.sheets).toHaveLength(2);
    expect(worksheet.sheets.map((sheet) => sheet.index)).toEqual([1, 2]);
    for (const sheet of worksheet.sheets) {
      expect(sheet.tables).toHaveLength(3);
      for (const table of sheet.tables) {
        expect(table.columns).toHaveLength(6);
      }
    }
  });

  it('gives every column as many numbers as its table has rows', () => {
    const worksheet = buildWorksheet(config({ tableCount: 3, growRows: true }), createSeededRandom(3));

    for (const table of worksheet.sheets[0].tables) {
      for (const column of table.columns) {
        expect(column.numbers).toHaveLength(table.rowCount);
      }
    }
  });

  it('answers each column with the sum of its numbers', () => {
    const worksheet = buildWorksheet(config(), createSeededRandom(11));

    for (const table of worksheet.sheets[0].tables) {
      for (const column of table.columns) {
        expect(column.answer).toBe(column.numbers.reduce((sum, value) => sum + value, 0));
      }
    }
  });

  it('never lets a running total go negative, so the child can work on an abacus', () => {
    const worksheet = buildWorksheet(config({ section: 'katta', tableCount: 2 }), createSeededRandom(5));

    for (const table of worksheet.sheets[0].tables) {
      for (const column of table.columns) {
        let total = 0;
        for (const value of column.numbers) {
          total += value;
          expect(total).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('opens every column with a positive number', () => {
    const worksheet = buildWorksheet(config({ section: 'kichik' }), createSeededRandom(19));

    for (const table of worksheet.sheets[0].tables) {
      for (const column of table.columns) {
        expect(column.numbers[0]).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the numbers inside the chosen digit count', () => {
    const worksheet = buildWorksheet(
      config({ digitCount: 2, section: 'formulasiz' }),
      createSeededRandom(23),
    );

    for (const table of worksheet.sheets[0].tables) {
      for (const column of table.columns) {
        for (const value of column.numbers) {
          expect(Math.abs(value)).toBeGreaterThanOrEqual(10);
          expect(Math.abs(value)).toBeLessThanOrEqual(99);
        }
      }
    }
  });

  it('normalizes the config it was handed and reports the one it used', () => {
    const worksheet = buildWorksheet(config({ columnCount: 99 }), createSeededRandom(2));

    expect(worksheet.config.columnCount).toBe(WORKSHEET_LIMITS.columnCount.max);
    expect(worksheet.headings).toHaveLength(WORKSHEET_LIMITS.columnCount.max);
  });

  it('gives two sheets different problems', () => {
    const worksheet = buildWorksheet(config({ sheetCount: 2 }), createSeededRandom(13));
    const [first, second] = worksheet.sheets;

    expect(JSON.stringify(first.tables)).not.toBe(JSON.stringify(second.tables));
  });
});

describe('worksheetBrandFor', () => {
  it("heads the sheet with the teacher's centre, phone and name", () => {
    expect(
      worksheetBrandFor({
        firstName: 'Dilnoza',
        lastName: 'Karimova',
        centerName: 'Bilim',
        phone: '+998 90 123 45 67',
      }),
    ).toEqual({ title: 'BILIM', contact: '+998 90 123 45 67', footer: 'DILNOZA KARIMOVA' });
  });

  it('falls back to the platform when the teacher works without a centre or phone', () => {
    expect(worksheetBrandFor({ firstName: '', lastName: '', centerName: '', phone: '' })).toEqual(
      DEFAULT_WORKSHEET_BRAND,
    );
  });
});
