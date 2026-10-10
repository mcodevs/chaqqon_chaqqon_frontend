import type { Worksheet, WorksheetBrand, WorksheetTable } from '@/domain/practice/worksheet';
import { rowHeightMm } from './sheetLayout';

/*
 * The worksheet as a PDF file, for the teacher inside Telegram, where the browser's print dialog
 * does not open. Written by hand rather than with a library: the sheets are only text, lines and
 * boxes, so the two built-in PDF fonts (Helvetica and its bold) and a few drawing commands are all
 * it takes. The layout follows the printed sheet (WorksheetSheet.module.css): same A4 margins, same
 * row heights from `rowHeightMm`, header and footer, then the answer key.
 */

const MM = 72 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN_X = 12 * MM;
const MARGIN_TOP = 12 * MM;
const MARGIN_BOTTOM = 12 * MM;
const HEAD_H = 10 * MM;
const LABEL_W = 16 * MM;

/** The built-in fonts speak WinAnsi, not Unicode: Uzbek apostrophes and the minus are mapped onto it. */
function toWinAnsi(text: string): string {
  return text
    .replace(/[‘’ʻʼ`]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapeText(text: string): string {
  return toWinAnsi(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Helvetica's advance widths for the characters a sheet uses, in 1/1000 em (digits are all 556). */
function textWidth(text: string, size: number, bold: boolean): number {
  let units = 0;
  for (const ch of toWinAnsi(text)) {
    if (/[0-9]/.test(ch)) units += 556;
    else if (ch === ' ') units += 278;
    else if (ch === '-') units += 333;
    else if (/[A-Z]/.test(ch)) units += bold ? 722 : 667;
    else units += bold ? 611 : 556;
  }
  return (units / 1000) * size;
}

class Page {
  readonly ops: string[] = [];

  text(
    x: number,
    y: number,
    text: string,
    size: number,
    bold = false,
    align: 'left' | 'center' | 'right' = 'left',
  ) {
    const width = textWidth(text, size, bold);
    const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    this.ops.push(
      `BT /${bold ? 'F2' : 'F1'} ${size.toFixed(2)} Tf ${left.toFixed(2)} ${y.toFixed(2)} Td (${escapeText(text)}) Tj ET`,
    );
  }

  rect(x: number, y: number, w: number, h: number, width = 0.6) {
    this.ops.push(`${width} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.6) {
    this.ops.push(`${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }
}

/** Header and footer every sheet carries; returns the y the body starts below (PDF y grows upward). */
function frame(page: Page, brand: WorksheetBrand, pageLabel: string): number {
  const top = PAGE_H - MARGIN_TOP;
  page.text(MARGIN_X, top - 6 * MM, brand.title, 13, true);
  page.text(PAGE_W - MARGIN_X, top - 6 * MM, brand.contact, 10, false, 'right');
  page.line(MARGIN_X, top - HEAD_H + 1.5 * MM, PAGE_W - MARGIN_X, top - HEAD_H + 1.5 * MM, 0.8);
  page.text(MARGIN_X, MARGIN_BOTTOM, brand.footer, 9);
  page.text(PAGE_W - MARGIN_X, MARGIN_BOTTOM, pageLabel, 9, false, 'right');
  return top - HEAD_H - 2 * MM;
}

/** One table: optional row label column, heading row, number rows, a taller blank answer row. */
function drawTable(
  page: Page,
  top: number,
  table: WorksheetTable,
  headings: string[],
  rowH: number,
  withLabels: boolean,
): number {
  const left = MARGIN_X + (withLabels ? LABEL_W : 0);
  const cellW = (PAGE_W - MARGIN_X - left) / headings.length;
  const size = Math.min(12, rowH * 0.62);
  const answerH = rowH * 1.15;
  let y = top;

  const row = (cells: string[], h: number, bold: boolean) => {
    cells.forEach((cell, col) => {
      page.rect(left + col * cellW, y - h, cellW, h);
      if (cell)
        page.text(left + col * cellW + cellW / 2, y - h / 2 - size * 0.35, cell, size, bold, 'center');
    });
    y -= h;
  };

  row(headings, rowH, true);
  for (let r = 0; r < table.rowCount; r++) {
    row(
      table.columns.map((c) => {
        const v = c.numbers[r];
        return v === undefined ? '' : v < 0 ? `-${Math.abs(v)}` : String(v);
      }),
      rowH,
      false,
    );
  }
  row(
    table.columns.map(() => ''),
    answerH,
    false,
  );

  if (withLabels) {
    const bodyH = rowH * (table.rowCount + 1);
    page.rect(MARGIN_X, top - bodyH, LABEL_W, bodyH);
    page.text(MARGIN_X + LABEL_W / 2, top - bodyH / 2 - size * 0.35, table.label, size, true, 'center');
    page.rect(MARGIN_X, y, LABEL_W, answerH);
    page.text(MARGIN_X + LABEL_W / 2, y + answerH / 2 - 3, 'Javoblar', Math.min(8, size), false, 'center');
  } else {
    y -= rowH * 0.7;
    page.text(MARGIN_X, y, 'VAQTI________', Math.min(10, size));
  }
  return y - rowH * 0.6;
}

function sheetPages(worksheet: Worksheet, brand: WorksheetBrand): Page[] {
  const { headings, config } = worksheet;
  const withLabels = config.layout === 'numbers';
  const pages = worksheet.sheets.map((sheet) => {
    const page = new Page();
    const rowH = rowHeightMm(sheet.tables, config.layout) * MM;
    let y = frame(page, brand, String(sheet.index));
    for (const table of sheet.tables) y = drawTable(page, y, table, headings, rowH, withLabels);
    return page;
  });

  if (config.withAnswers) {
    let page = new Page();
    let y = frame(page, brand, 'Javoblar');
    page.text(PAGE_W / 2, y - 6 * MM, 'Javoblar kaliti', 14, true, 'center');
    y -= 12 * MM;
    const rowH = 6 * MM;
    const left = MARGIN_X + LABEL_W;
    const cellW = (PAGE_W - MARGIN_X - left) / headings.length;
    for (const sheet of worksheet.sheets) {
      if (y - rowH * 3 < MARGIN_BOTTOM + 8 * MM) {
        pages.push(page);
        page = new Page();
        y = frame(page, brand, 'Javoblar');
      }
      page.text(MARGIN_X, y - 4 * MM, `${sheet.index}-varaq`, 10, true);
      y -= 6 * MM;
      for (const table of sheet.tables) {
        if (y - rowH * 2 < MARGIN_BOTTOM + 8 * MM) {
          pages.push(page);
          page = new Page();
          y = frame(page, brand, 'Javoblar');
        }
        const rows: [string, string[], boolean][] = [
          [table.label, headings, true],
          ['=', table.columns.map((c) => String(c.answer)), false],
        ];
        for (const [label, cells, bold] of rows) {
          page.rect(MARGIN_X, y - rowH, LABEL_W, rowH);
          page.text(MARGIN_X + LABEL_W / 2, y - rowH / 2 - 3, label, 9, true, 'center');
          cells.forEach((cell, col) => {
            page.rect(left + col * cellW, y - rowH, cellW, rowH);
            page.text(left + col * cellW + cellW / 2, y - rowH / 2 - 3, cell, 9, bold, 'center');
          });
          y -= rowH;
        }
        y -= 2 * MM;
      }
    }
    pages.push(page);
  }
  return pages;
}

/** Assembles the pages into a PDF 1.4 file. */
export function worksheetPdf(worksheet: Worksheet, brand: WorksheetBrand): Uint8Array {
  const pages = sheetPages(worksheet, brand);
  const objects: string[] = [];
  // 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, then a page + content pair per page.
  const pageIds = pages.map((_, i) => 5 + i * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((page, i) => {
    const content = page.ops.join('\n');
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Everything above is ASCII (toWinAnsi), so one byte per character keeps the offsets true.
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return bytes;
}
