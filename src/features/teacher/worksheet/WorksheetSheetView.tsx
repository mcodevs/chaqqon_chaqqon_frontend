import type { CSSProperties, ReactNode } from 'react';
import type { Worksheet, WorksheetBrand, WorksheetSheet } from '@/domain/practice/worksheet';
import { printedNumber, rowHeightMm } from './sheetLayout';
import styles from './WorksheetSheet.module.css';

/*
 * One A4 sheet, in the measurements it will be printed at. The same markup serves the on-screen
 * preview and the print copy, so what the teacher checks is what comes out of the printer.
 */

interface SheetFrameProps {
  brand: WorksheetBrand;
  /** Printed bottom right; the answer key continues the same numbering. */
  pageLabel: string;
  rowHeight?: number;
  children: ReactNode;
}

function SheetFrame({ brand, pageLabel, rowHeight, children }: SheetFrameProps) {
  const style = rowHeight ? ({ ['--row-h' as string]: `${rowHeight}mm` } as CSSProperties) : undefined;

  return (
    <article className={styles.sheet} style={style}>
      <header className={styles.sheetHead}>
        <span className={styles.brandName}>{brand.title}</span>
        <span className={styles.brandContact}>{brand.contact}</span>
      </header>

      <div className={styles.sheetBody}>{children}</div>

      <footer className={styles.sheetFoot}>
        <span className={styles.footName}>{brand.footer}</span>
        <span className={styles.footPage}>{pageLabel}</span>
      </footer>
    </article>
  );
}

interface WorksheetSheetViewProps {
  worksheet: Worksheet;
  sheet: WorksheetSheet;
  brand: WorksheetBrand;
}

export function WorksheetSheetView({ worksheet, sheet, brand }: WorksheetSheetViewProps) {
  const { headings, config } = worksheet;
  const withLabels = config.layout === 'numbers';

  return (
    <SheetFrame
      brand={brand}
      pageLabel={String(sheet.index)}
      rowHeight={rowHeightMm(sheet.tables, config.layout)}
    >
      {sheet.tables.map((table, index) => (
        <div key={index} className={styles.block}>
          <table className={styles.grid}>
            <tbody>
              <tr>
                {withLabels && (
                  <td className={styles.rowLabel} rowSpan={table.rowCount + 1}>
                    {table.label}
                  </td>
                )}
                {headings.map((heading) => (
                  <th key={heading} className={styles.heading} scope="col">
                    {heading}
                  </th>
                ))}
              </tr>

              {Array.from({ length: table.rowCount }, (_, row) => (
                <tr key={row}>
                  {table.columns.map((column, col) => (
                    <td key={col} className={styles.cell}>
                      {printedNumber(column.numbers[row])}
                    </td>
                  ))}
                </tr>
              ))}

              <tr className={styles.answerRow}>
                {withLabels && <td className={styles.rowLabel}>Javoblar</td>}
                {table.columns.map((_, col) => (
                  <td key={col} className={styles.blank} />
                ))}
              </tr>
            </tbody>
          </table>

          {!withLabels && <p className={styles.timeLine}>VAQTI________</p>}
        </div>
      ))}
    </SheetFrame>
  );
}

interface WorksheetAnswerSheetProps {
  worksheet: Worksheet;
  brand: WorksheetBrand;
}

/** The teacher's own copy: every table's answers, all the sheets on one page where they fit. */
export function WorksheetAnswerSheet({ worksheet, brand }: WorksheetAnswerSheetProps) {
  const { headings, sheets } = worksheet;

  return (
    <SheetFrame brand={brand} pageLabel="Javoblar">
      <h2 className={styles.answerTitle}>Javoblar kaliti</h2>

      {sheets.map((sheet) => (
        <section key={sheet.index} className={styles.answerSheetBlock}>
          <h3 className={styles.answerSheetTitle}>{sheet.index}-varaq</h3>
          {sheet.tables.map((table, index) => (
            <table key={index} className={`${styles.grid} ${styles.answerGrid}`}>
              <tbody>
                <tr>
                  <td className={styles.rowLabel}>{table.label}</td>
                  {headings.map((heading) => (
                    <th key={heading} className={styles.heading} scope="col">
                      {heading}
                    </th>
                  ))}
                </tr>
                <tr>
                  <td className={styles.rowLabel}>=</td>
                  {table.columns.map((column, col) => (
                    <td key={col} className={styles.answerCell}>
                      {column.answer}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ))}
        </section>
      ))}
    </SheetFrame>
  );
}
