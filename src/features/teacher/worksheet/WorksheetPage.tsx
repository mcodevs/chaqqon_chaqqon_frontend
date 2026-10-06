import { type CSSProperties, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createSeededRandom } from '@/domain/random';
import {
  DEFAULT_WORKSHEET_BRAND,
  DEFAULT_WORKSHEET_CONFIG,
  type Worksheet,
  type WorksheetBrand,
  type WorksheetConfig,
  buildWorksheet,
  normalizeWorksheetConfig,
} from '@/domain/practice/worksheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/Notice';
import { plannedTables, sheetOverflows } from './sheetLayout';
import { SHEET_WIDTH_PX, useFitScale } from './useFitScale';
import { WorksheetAnswerSheet, WorksheetSheetView } from './WorksheetSheetView';
import { WorksheetForm } from './WorksheetForm';
import styles from './Worksheet.module.css';

/*
 * Printed homework. The teacher picks a topic and a shape, the page draws the sheets at their real
 * A4 size, and the browser's own print dialog turns them into paper or a PDF.
 *
 * Generation is behind a button rather than live: a ten-sheet packet is a few hundred problems and
 * takes a moment, which would make every chip tap feel slow.
 */

const STORAGE_KEY = 'chaqqon.worksheet';

interface SavedSetup {
  config: WorksheetConfig;
  brand: WorksheetBrand;
}

/** The last setup the teacher used, so next week's packet starts where this one left off. */
function loadSetup(): SavedSetup {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: DEFAULT_WORKSHEET_CONFIG, brand: DEFAULT_WORKSHEET_BRAND };
    const saved = JSON.parse(raw) as Partial<SavedSetup>;
    return {
      config: normalizeWorksheetConfig(saved.config),
      brand: { ...DEFAULT_WORKSHEET_BRAND, ...saved.brand },
    };
  } catch {
    return { config: DEFAULT_WORKSHEET_CONFIG, brand: DEFAULT_WORKSHEET_BRAND };
  }
}

function saveSetup(setup: SavedSetup): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch {
    // A full or blocked storage only costs the teacher their last setup; the page still works.
  }
}

function problemCount(config: WorksheetConfig): number {
  return config.tableCount * config.columnCount * config.sheetCount;
}

export function WorksheetPage() {
  const [setup, setSetup] = useState(loadSetup);
  /** Bumped to redraw; null means nothing has been generated yet. */
  const [draw, setDraw] = useState<{ config: WorksheetConfig; seed: number } | null>(null);

  const { config, brand } = setup;
  const [previewRef, previewScale] = useFitScale(SHEET_WIDTH_PX);

  const update = (next: Partial<SavedSetup>) => {
    setSetup((current) => {
      const merged = { ...current, ...next };
      saveSetup(merged);
      return merged;
    });
  };

  const worksheet: Worksheet | null = useMemo(
    () => (draw ? buildWorksheet(draw.config, createSeededRandom(draw.seed)) : null),
    [draw],
  );

  const generate = () => setDraw({ config, seed: Date.now() });

  // Too many tables, or too long ones, spill onto a second sheet however small the grid is drawn.
  const overflows = sheetOverflows(plannedTables(config), config.layout);

  // The preview is of the config it was drawn from, which the teacher may have changed since.
  const stale = draw !== null && JSON.stringify(draw.config) !== JSON.stringify(config);

  const sheets = worksheet && (
    <>
      {worksheet.sheets.map((sheet) => (
        <WorksheetSheetView key={sheet.index} worksheet={worksheet} sheet={sheet} brand={brand} />
      ))}
      {worksheet.config.withAnswers && <WorksheetAnswerSheet worksheet={worksheet} brand={brand} />}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.columns}>
        <Card title="Yozma vazifa sozlamalari" className={styles.formCard}>
          <WorksheetForm
            config={config}
            brand={brand}
            onConfigChange={(next) => update({ config: next })}
            onBrandChange={(next) => update({ brand: next })}
          />

          {overflows && (
            <p className={styles.warning}>
              Bu sozlamada jadvallar bir varaqqa sig‘maydi va keyingi betga o‘tadi. Jadvallar yoki qatorlar
              sonini kamaytiring.
            </p>
          )}

          <Button block onClick={generate}>
            {draw ? '♻️ Qaytadan yaratish' : '📄 Varaqlarni yaratish'}
          </Button>
          <p className={styles.hint}>
            {config.sheetCount} varaq · {problemCount(config)} ta misol
          </p>
        </Card>

        <div className={styles.previewColumn}>
          {worksheet ? (
            <>
              <div className={styles.previewBar}>
                <span className={styles.previewTitle}>
                  Ko‘rinish{stale && <em className={styles.staleTag}>sozlama o‘zgardi</em>}
                </span>
                <div className={styles.previewActions}>
                  <Button variant="outline" size="sm" onClick={generate}>
                    🔀 Boshqa misollar
                  </Button>
                  <Button size="sm" onClick={() => window.print()}>
                    🖨️ Chop etish
                  </Button>
                </div>
              </div>

              <p className={styles.printTip}>
                Chop etish oynasida qog‘oz A4, chekkalar (margins) «Default» bo‘lsin va «Headers and footers»
                o‘chirilsin. «Save as PDF» ni tanlasangiz, fayl bo‘lib saqlanadi.
              </p>

              <div className={styles.previewScroll} ref={previewRef}>
                <div className={styles.previewStack} style={{ zoom: previewScale } as CSSProperties}>
                  {sheets}
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="🖨️" title="Hali varaq yaratilmagan">
              Mavzu va sozlamalarni tanlang, so‘ng «Varaqlarni yaratish» tugmasini bosing.
            </EmptyState>
          )}
        </div>
      </div>

      {/*
       * The print copy lives on <body>, outside the dashboard shell, so printing never has to
       * undo the sidebar, the scroll container and the page background. It is hidden on screen.
       */}
      {worksheet &&
        createPortal(
          <div data-print-root className={styles.printRoot}>
            {sheets}
          </div>,
          document.body,
        )}
    </div>
  );
}
