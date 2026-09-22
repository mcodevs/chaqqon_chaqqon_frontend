import { useMemo, useState } from 'react';
import type { CalendarDate } from '@/domain/billing';
import type { DailyActivity } from '@/domain/statistics';
import { buildMonthGrid, shiftMonth, startOfMonth } from '@/domain/streak';
import styles from './StreakCalendar.module.css';

interface StreakCalendarProps {
  dailyActivity: readonly DailyActivity[];
  today: CalendarDate;
}

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const MONTH_NAMES = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

function monthLabel(month: CalendarDate): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

function intensityClass(sessions: number): string {
  if (sessions === 0) return '';
  if (sessions === 1) return styles.level1;
  if (sessions <= 3) return styles.level2;
  return styles.level3;
}

/** A month of practice days, one cell per day, shaded by how many sessions it holds. */
export function StreakCalendar({ dailyActivity, today }: StreakCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(today));
  const weeks = useMemo(() => buildMonthGrid(dailyActivity, month), [dailyActivity, month]);
  const isCurrentMonth = month === startOfMonth(today);

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Oldingi oy"
        >
          ‹
        </button>
        <span className={styles.monthLabel}>{monthLabel(month)}</span>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrentMonth}
          aria-label="Keyingi oy"
        >
          ›
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className={styles.weekday}>
            {weekday}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const dayNumber = Number(day.date.slice(8));
          const classes = [styles.day];
          if (!day.inMonth) classes.push(styles.outside);
          else {
            const intensity = intensityClass(day.sessions);
            if (intensity) classes.push(intensity);
            if (day.date === today) classes.push(styles.today);
          }
          return (
            <div
              key={day.date}
              className={classes.join(' ')}
              title={
                day.inMonth
                  ? `${day.date}: ${day.sessions > 0 ? `${day.sessions} ta mashq` : 'mashq yoʻq'}`
                  : undefined
              }
            >
              {dayNumber}
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span>Kam</span>
        <div className={styles.legendCells}>
          <span className={styles.legendCell} />
          <span className={`${styles.legendCell} ${styles.level1}`} />
          <span className={`${styles.legendCell} ${styles.level2}`} />
          <span className={`${styles.legendCell} ${styles.level3}`} />
        </div>
        <span>Koʻp</span>
      </div>
    </div>
  );
}
