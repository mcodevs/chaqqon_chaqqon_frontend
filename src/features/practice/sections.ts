import type { SectionId } from '@/domain/practice/config';
import type { Tone } from '@/shared/ui/tone';

interface SectionMeta {
  label: string;
  description: string;
  tone: Tone;
}

export const SECTION_META: Record<SectionId, SectionMeta> = {
  formulasiz: { label: 'Formulasiz', description: 'Abakusda tosh yetadi', tone: 'green' },
  kichik: { label: "Kichik do'st", description: '5 ichida, +5−x', tone: 'blue' },
  katta: { label: "Katta do'st", description: "10 ichida, o'nlikka o'tish", tone: 'violet' },
  miks: { label: 'Miks / Oila formulasi', description: "Bir necha xonaga o'tish", tone: 'pink' },
};
