import {
  type WorksheetConfig,
  type WorksheetLayout,
  type WorksheetTable,
  rowCountForTable,
} from '@/domain/practice/worksheet';

/** A4 height minus the print margins, the sheet header and the footer. */
const BODY_HEIGHT_MM = 258;
/** The blank answer row is drawn taller than a number row — there is handwriting going in it. */
const ANSWER_ROW_SLOTS = 1.15;
/*
 * What a table costs beyond its rows, counted in rows. Everything around a table is sized from the
 * row height too (see the stylesheet), so these stay true whatever the grid is scaled to: the gap
 * below every table, plus the "VAQTI____" line that only the lettered layout draws.
 */
const TABLE_EXTRA_SLOTS: Record<WorksheetLayout, number> = { letters: 1.45, numbers: 0.65 };
const ROW_HEIGHT_MM = { min: 4.2, max: 8.4 } as const;

/**
 * Picks a row height that makes the sheet's tables fill the page without running onto the next one:
 * four tables of eight rows need a tighter grid than one table of five.
 */
export function rowHeightMm(
  tables: readonly Pick<WorksheetTable, 'rowCount'>[],
  layout: WorksheetLayout,
): number {
  if (tables.length === 0) return ROW_HEIGHT_MM.max;
  const height = BODY_HEIGHT_MM / slotsFor(tables, layout);
  return Math.max(ROW_HEIGHT_MM.min, Math.min(ROW_HEIGHT_MM.max, height));
}

/** How tall a sheet's tables are, counted in rows: numbers, heading rows, answer rows and gaps. */
function slotsFor(tables: readonly Pick<WorksheetTable, 'rowCount'>[], layout: WorksheetLayout): number {
  const rows = tables.reduce((total, table) => total + table.rowCount + 1 + ANSWER_ROW_SLOTS, 0);
  return rows + tables.length * TABLE_EXTRA_SLOTS[layout];
}

/** The tables a config would put on one sheet, before any of their numbers are drawn. */
export function plannedTables(config: WorksheetConfig): { rowCount: number }[] {
  return Array.from({ length: config.tableCount }, (_, index) => ({
    rowCount: rowCountForTable(config, index),
  }));
}

/**
 * True when the tables cannot be squeezed onto one sheet even at the smallest row height still
 * worth writing in — the teacher is told, rather than finding out at the printer.
 */
export function sheetOverflows(
  tables: readonly Pick<WorksheetTable, 'rowCount'>[],
  layout: WorksheetLayout,
): boolean {
  return slotsFor(tables, layout) * ROW_HEIGHT_MM.min > BODY_HEIGHT_MM;
}

/** Printed the way the booklets write it: no plus sign, a real minus for a subtraction. */
export function printedNumber(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}
