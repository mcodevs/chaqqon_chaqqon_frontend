import type { SectionId } from '@/domain/practice/config';

interface SectionMeta {
  label: string;
  description: string;
  /**
   * The section's identity colour, from the data ramp — sections are categories, not
   * states, so they never borrow the success/warning/danger meanings.
   */
  color: string;
  /** Tinted pair for chips and badges. */
  soft: string;
}

export const SECTION_META: Record<SectionId, SectionMeta> = {
  formulasiz: {
    label: 'Formulasiz',
    description: 'Abakusda tosh yetadi',
    color: 'var(--data-3)',
    soft: 'var(--success-soft)',
  },
  kichik: {
    label: "Kichik do'st",
    description: '5 ichida, +5−x',
    color: 'var(--data-2)',
    soft: 'var(--info-soft)',
  },
  katta: {
    label: "Katta do'st",
    description: "10 ichida, o'nlikka o'tish",
    color: 'var(--data-1)',
    soft: 'var(--brand-primary-soft)',
  },
  miks: {
    label: 'Miks / Oila formulasi',
    description: "Bir necha xonaga o'tish",
    color: 'var(--data-5)',
    soft: 'var(--danger-soft)',
  },
};
