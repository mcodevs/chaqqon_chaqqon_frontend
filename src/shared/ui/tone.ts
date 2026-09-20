/*
 * Tones carry meaning, not decoration: `brand` for the one action a screen is about,
 * `success` / `danger` / `warning` / `info` for outcomes, `neutral` for everything else.
 * The old colour names still resolve, so older screens keep working while they migrate.
 */
export type SemanticTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type LegacyTone = 'coral' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink';
export type Tone = SemanticTone | LegacyTone;

const LEGACY_TONES: Record<LegacyTone, SemanticTone> = {
  coral: 'brand',
  violet: 'brand',
  pink: 'brand',
  green: 'success',
  blue: 'info',
  orange: 'warning',
  yellow: 'warning',
};

export function semanticTone(tone: Tone): SemanticTone {
  return (LEGACY_TONES as Record<string, SemanticTone>)[tone] ?? (tone as SemanticTone);
}

const TONE_COLOR: Record<SemanticTone, string> = {
  brand: 'var(--brand-primary)',
  neutral: 'var(--content-secondary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

/** The tone's strong colour — for fills, bars and icons. */
export function toneColor(tone: Tone): string {
  return TONE_COLOR[semanticTone(tone)];
}

/** The tone's tinted background, for soft chips and badges. */
export function toneSoftColor(tone: Tone): string {
  const semantic = semanticTone(tone);
  if (semantic === 'brand') return 'var(--brand-primary-soft)';
  if (semantic === 'neutral') return 'var(--surface-soft)';
  return `var(--${semantic}-soft)`;
}

/** Readable text colour on top of `toneSoftColor`. */
export function toneContentColor(tone: Tone): string {
  const semantic = semanticTone(tone);
  if (semantic === 'brand') return 'var(--brand-primary)';
  if (semantic === 'neutral') return 'var(--content-secondary)';
  return `var(--${semantic}-content)`;
}
