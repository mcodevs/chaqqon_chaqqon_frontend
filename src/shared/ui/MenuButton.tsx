import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import styles from './MenuButton.module.css';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  /** Destructive actions are tinted and sit last, away from the routine ones. */
  danger?: boolean;
  icon?: string;
}

/**
 * The two or three actions a row rarely needs, folded behind one button.
 * Keeping them out of the row is what lets the everyday actions carry weight.
 */
export function MenuButton({
  actions,
  label = 'Boshqa amallar',
  children,
}: {
  actions: readonly MenuAction[];
  label?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {children ?? <span aria-hidden="true">⋯</span>}
      </button>

      {open && (
        <div className={styles.menu} id={menuId} role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={`${styles.item} ${action.danger ? styles.danger : ''}`}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.icon && (
                <span className={styles.itemIcon} aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
