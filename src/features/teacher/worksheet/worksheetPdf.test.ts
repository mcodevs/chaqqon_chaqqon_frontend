import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '@/domain/random';
import {
  DEFAULT_WORKSHEET_BRAND,
  DEFAULT_WORKSHEET_CONFIG,
  buildWorksheet,
} from '@/domain/practice/worksheet';
import { worksheetPdf } from './worksheetPdf';

const text = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe('worksheetPdf', () => {
  const worksheet = buildWorksheet(
    { ...DEFAULT_WORKSHEET_CONFIG, sheetCount: 2, withAnswers: true },
    createSeededRandom(7),
  );
  const pdf = text(worksheetPdf(worksheet, { ...DEFAULT_WORKSHEET_BRAND, footer: 'O‘QITUVCHI' }));

  it('is a complete PDF with one page per sheet plus the answer key', () => {
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toMatch(/\/Count 3 /);
  });

  it('points the cross-reference table at every object', () => {
    const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(pdf.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it('stays in the fonts’ character set', () => {
    expect([...pdf].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
    expect(pdf).toContain("(O'QITUVCHI)");
  });
});
