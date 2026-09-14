export type Tone = 'coral' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink';

export function toneColor(tone: Tone): string {
  return `var(--color-${tone})`;
}
