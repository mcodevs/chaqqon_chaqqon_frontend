import { useLayoutEffect, useRef, useState } from 'react';
import type { MonthTotals } from '@/domain/platformStats';
import { formatSom } from '@/shared/format';
import styles from './Admin.module.css';
import { compactSom, monthLabel } from './periods';

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 20;
const GAP = 2;

const SERIES = [
  { key: 'payments', label: 'Tushgan pul', color: 'var(--chart-income)' },
  { key: 'charges', label: 'Hisoblangan oylik', color: 'var(--chart-charge)' },
] as const;

/** A clean top for the axis: 1, 2 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((step) => step * power).find((candidate) => candidate >= value) ?? value;
}

/** Path of a column with a rounded top and a square foot on the baseline. */
function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

/**
 * Money received against fees charged, month by month. Columns are sized in real pixels from the
 * card's width, so the labels stay readable on a phone; every value is also in the table view.
 */
export function FinanceChart({ months }: { months: MonthTotals[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Measured from the card before anything is drawn: a guessed width would widen the card itself.
  const [measured, setMeasured] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useLayoutEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [showTable]);

  const width = Math.max(280, measured ?? 0);
  const top = niceMax(Math.max(...months.flatMap((m) => [m.payments, m.charges])));
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotWidth / months.length;
  const bar = Math.max(4, Math.min(MAX_BAR, (slot - 10 - GAP) / 2));
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  const ticks = [0, top / 2, top];
  // Only every other month is named when the slots get narrow, counting back from the current one.
  const labelEvery = slot < 34 ? 2 : 1;
  const current = active === null ? null : months[active];

  return (
    <figure className={styles.chart}>
      <div className={styles.chartHeader}>
        <ul className={styles.legend}>
          {SERIES.map((series) => (
            <li key={series.key}>
              <span className={styles.legendSwatch} style={{ background: series.color }} aria-hidden="true" />
              {series.label}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.linkButton} onClick={() => setShowTable((value) => !value)}>
          {showTable ? 'Grafik' : 'Jadval'}
        </button>
      </div>

      {showTable ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Oy</th>
              <th scope="col">Tushgan pul</th>
              <th scope="col">Hisoblangan oylik</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{monthLabel(month.month, true)}</th>
                <td>{formatSom(month.payments)}</td>
                <td>{formatSom(month.charges)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={wrapRef} className={styles.chartPlot} onPointerLeave={() => setActive(null)}>
          {measured !== null && (
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label="Oylar bo'yicha tushgan pul va hisoblangan oylik"
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    className={tick === 0 ? styles.axisLine : styles.gridLine}
                  />
                  <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className={styles.axisText}>
                    {compactSom(tick)}
                  </text>
                </g>
              ))}

              {months.map((month, index) => {
                const center = PAD.left + slot * index + slot / 2;
                const left = center - bar - GAP / 2;
                return (
                  <g
                    key={month.month}
                    tabIndex={0}
                    className={styles.chartSlot}
                    data-active={active === index}
                    aria-label={`${monthLabel(month.month, true)}: tushgan ${formatSom(month.payments)}, hisoblangan ${formatSom(month.charges)}`}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  >
                    {/* The hit area is the whole month, not the thin columns. */}
                    <rect
                      x={PAD.left + slot * index}
                      y={PAD.top}
                      width={slot}
                      height={plotHeight}
                      fill="transparent"
                    />
                    {SERIES.map((series, i) => {
                      const value = month[series.key];
                      if (value <= 0) return null;
                      return (
                        <path
                          key={series.key}
                          d={columnPath(left + i * (bar + GAP), y(value), bar, y(0) - y(value))}
                          fill={series.color}
                        />
                      );
                    })}
                    {(months.length - 1 - index) % labelEvery === 0 && (
                      <text x={center} y={HEIGHT - 8} textAnchor="middle" className={styles.axisText}>
                        {monthLabel(month.month)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {current && active !== null && (
            <div
              className={styles.tooltip}
              // Beside the month, on whichever side has room, so it is never cut off at the card's edge.
              style={
                PAD.left + slot * active + slot / 2 > width / 2
                  ? { right: width - (PAD.left + slot * active) + 4 }
                  : { left: PAD.left + slot * (active + 1) + 4 }
              }
              role="status"
            >
              <span className={styles.tooltipTitle}>{monthLabel(current.month, true)}</span>
              {SERIES.map((series) => (
                <span key={series.key} className={styles.tooltipRow}>
                  <span
                    className={styles.tooltipKey}
                    style={{ background: series.color }}
                    aria-hidden="true"
                  />
                  <strong>{formatSom(current[series.key])}</strong>
                  <span className={styles.tooltipLabel}>{series.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
