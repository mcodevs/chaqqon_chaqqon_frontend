import type { Random } from '../random';
import { type Range, type SectionId, isSectionId } from './config';
import { generateProblem } from './problem';
import { getTopic, isTopicId } from './topics';

/*
 * Printed homework: the same problems the app flashes, laid out as a paper worksheet the way the
 * olympiad booklets do it — one table per exercise, one problem per column, the sum left blank.
 *
 * Two layouts are in use, and the teacher picks between them:
 *   `letters` — columns headed A…J, an empty bottom row for the answers, "VAQTI____" underneath;
 *   `numbers` — columns headed 1…10, a roman numeral naming the table down the left, and the
 *               bottom row labelled "Javoblar".
 */

export const WORKSHEET_LAYOUTS = ['letters', 'numbers'] as const;
export type WorksheetLayout = (typeof WORKSHEET_LAYOUTS)[number];

export interface WorksheetConfig {
  /** The formula section, as in a practice config. */
  section: SectionId;
  /** One named topic from the curriculum; without it the whole section is drilled. */
  topicId?: string;
  digitCount: number;
  /** Numbers in one problem — the rows above the answer row. */
  rowCount: number;
  /** Problems in one table — the columns. */
  columnCount: number;
  /** Tables on one sheet. */
  tableCount: number;
  sheetCount: number;
  layout: WorksheetLayout;
  /** Each table on a sheet takes one row more than the one above it, as the booklets do. */
  growRows: boolean;
  /** Adds an answer key at the end, for the teacher's own copy. */
  withAnswers: boolean;
}

export const WORKSHEET_LIMITS = {
  digitCount: { min: 1, max: 3, step: 1 },
  rowCount: { min: 2, max: 12, step: 1 },
  columnCount: { min: 3, max: 10, step: 1 },
  tableCount: { min: 1, max: 6, step: 1 },
  sheetCount: { min: 1, max: 10, step: 1 },
} as const satisfies Record<string, Range>;

export const DEFAULT_WORKSHEET_CONFIG: WorksheetConfig = {
  section: 'formulasiz',
  digitCount: 1,
  rowCount: 5,
  columnCount: 10,
  tableCount: 4,
  sheetCount: 1,
  layout: 'letters',
  growRows: true,
  withAnswers: true,
};

/** What the sheet is headed and signed with; the teacher types these once. */
export interface WorksheetBrand {
  title: string;
  contact: string;
  footer: string;
}

export const DEFAULT_WORKSHEET_BRAND: WorksheetBrand = {
  title: 'CHAQQON-CHAQQON',
  contact: 'Mental arifmetika',
  footer: '',
};

export interface WorksheetColumn {
  /** Signed rows; negative values are subtractions. */
  numbers: number[];
  answer: number;
}

export interface WorksheetTable {
  /** Roman numeral naming the table, shown only by the `numbers` layout. */
  label: string;
  rowCount: number;
  columns: WorksheetColumn[];
}

export interface WorksheetSheet {
  /** 1-based page number, printed in the footer. */
  index: number;
  tables: WorksheetTable[];
}

export interface Worksheet {
  config: WorksheetConfig;
  /** Column headings, shared by every table: A…J or 1…10. */
  headings: string[];
  sheets: WorksheetSheet[];
}

const LETTERS = 'ABCDEFGHIJ';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function columnHeadings(layout: WorksheetLayout, columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, i) =>
    layout === 'letters' ? (LETTERS[i] ?? String(i + 1)) : String(i + 1),
  );
}

/** Table names restart on every sheet, so a child is told "jadval II", not "jadval XIV". */
export function tableLabel(index: number): string {
  return ROMAN[index] ?? String(index + 1);
}

export function isWorksheetLayout(value: unknown): value is WorksheetLayout {
  return typeof value === 'string' && (WORKSHEET_LAYOUTS as readonly string[]).includes(value);
}

/**
 * Brings a config from the form within the rules: unknown sections and topics fall back, numbers
 * are clamped, and a topic's own shape (its section, digit counts and shortest problem) wins.
 */
export function normalizeWorksheetConfig(value: unknown): WorksheetConfig {
  const input = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_WORKSHEET_CONFIG;

  const config: WorksheetConfig = {
    section: isSectionId(input.section) ? input.section : defaults.section,
    topicId: isTopicId(input.topicId) ? input.topicId : undefined,
    digitCount: clampInt(input.digitCount, WORKSHEET_LIMITS.digitCount, defaults.digitCount),
    rowCount: clampInt(input.rowCount, WORKSHEET_LIMITS.rowCount, defaults.rowCount),
    columnCount: clampInt(input.columnCount, WORKSHEET_LIMITS.columnCount, defaults.columnCount),
    tableCount: clampInt(input.tableCount, WORKSHEET_LIMITS.tableCount, defaults.tableCount),
    sheetCount: clampInt(input.sheetCount, WORKSHEET_LIMITS.sheetCount, defaults.sheetCount),
    layout: isWorksheetLayout(input.layout) ? input.layout : defaults.layout,
    growRows: typeof input.growRows === 'boolean' ? input.growRows : defaults.growRows,
    withAnswers: typeof input.withAnswers === 'boolean' ? input.withAnswers : defaults.withAnswers,
  };

  const topic = getTopic(config.topicId);
  if (!topic) return config;

  return {
    ...config,
    section: topic.section,
    digitCount: topic.digitCounts.includes(config.digitCount) ? config.digitCount : topic.digitCounts[0],
    rowCount: Math.max(config.rowCount, topic.minRowCount),
  };
}

/** Rows in the `index`-th table of a sheet — one more than the last when the rows grow. */
export function rowCountForTable(config: WorksheetConfig, index: number): number {
  if (!config.growRows) return config.rowCount;
  return Math.min(WORKSHEET_LIMITS.rowCount.max, config.rowCount + index);
}

export function buildWorksheet(config: WorksheetConfig, random: Random): Worksheet {
  const normalized = normalizeWorksheetConfig(config);

  const sheets = Array.from({ length: normalized.sheetCount }, (_, sheet) => ({
    index: sheet + 1,
    tables: Array.from({ length: normalized.tableCount }, (_, table) =>
      buildTable(normalized, table, random),
    ),
  }));

  return {
    config: normalized,
    headings: columnHeadings(normalized.layout, normalized.columnCount),
    sheets,
  };
}

function buildTable(config: WorksheetConfig, index: number, random: Random): WorksheetTable {
  const rowCount = rowCountForTable(config, index);
  const shape = {
    section: config.section,
    topicId: config.topicId,
    digitCount: config.digitCount,
    rowCount,
  };

  return {
    label: tableLabel(index),
    rowCount,
    columns: Array.from({ length: config.columnCount }, () => generateProblem(shape, random)),
  };
}

function clampInt(value: unknown, { min, max }: Range, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
