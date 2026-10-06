import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKSHEET_CONFIG } from '@/domain/practice/worksheet';
import { plannedTables, printedNumber, rowHeightMm, sheetOverflows } from './sheetLayout';

const tables = (...rowCounts: number[]) => rowCounts.map((rowCount) => ({ rowCount }));

/** The sheet the printed booklets use: four tables growing from five rows to eight. */
const BOOKLET = tables(5, 6, 7, 8);

describe('printedNumber', () => {
  it('writes an addition without a sign, as the booklets do', () => {
    expect(printedNumber(7)).toBe('7');
  });

  it('writes a subtraction with a minus', () => {
    expect(printedNumber(-6)).toBe('−6');
  });
});

describe('rowHeightMm', () => {
  it('never prints a row too small to write a number in', () => {
    expect(rowHeightMm(tables(12, 12, 12, 12, 12, 12), 'letters')).toBeGreaterThanOrEqual(4.2);
  });

  it('does not blow a single short table up to fill the page', () => {
    expect(rowHeightMm(tables(3), 'letters')).toBeLessThanOrEqual(8.4);
  });

  it('tightens the grid as more tables are asked for', () => {
    expect(rowHeightMm(tables(5, 5, 5, 5), 'letters')).toBeLessThan(rowHeightMm(tables(5, 5), 'letters'));
  });

  it('gives the numbered layout more room, since it draws no time line', () => {
    expect(rowHeightMm(BOOKLET, 'numbers')).toBeGreaterThan(rowHeightMm(BOOKLET, 'letters'));
  });
});

describe('plannedTables', () => {
  it('reads the rows each table will take from the config alone', () => {
    const config = { ...DEFAULT_WORKSHEET_CONFIG, tableCount: 3, rowCount: 5, growRows: true };
    expect(plannedTables(config)).toEqual([{ rowCount: 5 }, { rowCount: 6 }, { rowCount: 7 }]);
  });
});

describe('sheetOverflows', () => {
  it('passes a sheet the printed booklets fit on one page', () => {
    expect(sheetOverflows(BOOKLET, 'letters')).toBe(false);
    expect(sheetOverflows(BOOKLET, 'numbers')).toBe(false);
  });

  it('catches a sheet no row height can squeeze in', () => {
    expect(sheetOverflows(tables(12, 12, 12, 12, 12, 12), 'letters')).toBe(true);
  });
});
