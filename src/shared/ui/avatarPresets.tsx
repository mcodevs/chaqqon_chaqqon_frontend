import type { ReactNode } from 'react';

export interface AvatarPreset {
  id: string;
  category: 'boy' | 'girl';
  name: string;
  render: (size: number) => ReactNode;
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  // Boys
  {
    id: 'boy_cap',
    category: 'boy',
    name: 'Kepkali bola',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#3B82F6" />
        <circle cx="50" cy="52" r="32" fill="#FDE047" />
        {/* Cap */}
        <path d="M22 42 C22 24 78 24 78 42 Z" fill="#1D4ED8" />
        <path d="M18 42 L82 42 C82 42 75 36 50 36 C25 36 18 42 18 42 Z" fill="#1E40AF" />
        {/* Face */}
        <circle cx="40" cy="52" r="4" fill="#1F2937" />
        <circle cx="60" cy="52" r="4" fill="#1F2937" />
        <path d="M42 64 Q50 72 58 64" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'boy_glasses',
    category: 'boy',
    name: 'Kozoynakli bola',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#10B981" />
        <circle cx="50" cy="52" r="32" fill="#FEF08A" />
        {/* Hair */}
        <path d="M24 44 C20 30 35 18 50 18 C65 18 80 30 76 44 Z" fill="#4B5563" />
        {/* Glasses */}
        <circle cx="39" cy="52" r="10" stroke="#1F2937" strokeWidth="3" fill="rgba(255,255,255,0.4)" />
        <circle cx="61" cy="52" r="10" stroke="#1F2937" strokeWidth="3" fill="rgba(255,255,255,0.4)" />
        <path d="M49 52 L51 52" stroke="#1F2937" strokeWidth="3" />
        <circle cx="39" cy="52" r="3" fill="#1F2937" />
        <circle cx="61" cy="52" r="3" fill="#1F2937" />
        <path d="M43 68 Q50 74 57 68" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'boy_smile',
    category: 'boy',
    name: 'Shodon bola',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#F97316" />
        <circle cx="50" cy="52" r="32" fill="#FED7AA" />
        {/* Hair */}
        <path d="M28 42 C28 22 72 22 72 42 C72 32 60 26 50 26 C40 26 28 32 28 42 Z" fill="#92400E" />
        <circle cx="41" cy="50" r="4" fill="#1F2937" />
        <circle cx="59" cy="50" r="4" fill="#1F2937" />
        <circle cx="34" cy="56" r="3" fill="#F87171" opacity="0.6" />
        <circle cx="66" cy="56" r="3" fill="#F87171" opacity="0.6" />
        <path d="M40 62 Q50 74 60 62 Z" fill="#EF4444" />
      </svg>
    ),
  },
  {
    id: 'boy_smart',
    category: 'boy',
    name: 'Zukko bola',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#6366F1" />
        <circle cx="50" cy="52" r="32" fill="#FDE68A" />
        {/* Hair styled */}
        <path d="M24 40 Q50 14 76 40 Q68 28 50 28 Q32 28 24 40 Z" fill="#1E293B" />
        <circle cx="40" cy="52" r="4" fill="#1F2937" />
        <circle cx="60" cy="52" r="4" fill="#1F2937" />
        <path d="M43 65 Q50 71 57 65" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // Girls
  {
    id: 'girl_ribbon',
    category: 'girl',
    name: 'Bantikli qiz',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#EC4899" />
        {/* Hair */}
        <circle cx="28" cy="54" r="14" fill="#B45309" />
        <circle cx="72" cy="54" r="14" fill="#B45309" />
        <circle cx="50" cy="52" r="32" fill="#FDE047" />
        <path d="M24 44 C24 24 76 24 76 44 Q50 32 24 44 Z" fill="#B45309" />
        {/* Ribbon */}
        <path d="M38 24 L50 30 L38 36 Z" fill="#F43F5E" />
        <path d="M62 24 L50 30 L62 36 Z" fill="#F43F5E" />
        <circle cx="50" cy="30" r="4" fill="#FFE4E6" />
        {/* Eyes & Smile */}
        <circle cx="41" cy="52" r="4" fill="#1F2937" />
        <circle cx="59" cy="52" r="4" fill="#1F2937" />
        <circle cx="35" cy="58" r="4" fill="#FB7185" opacity="0.6" />
        <circle cx="65" cy="58" r="4" fill="#FB7185" opacity="0.6" />
        <path d="M42 64 Q50 72 58 64" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'girl_pigtails',
    category: 'girl',
    name: 'Dumba sochli qiz',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#8B5CF6" />
        {/* Pigtails */}
        <ellipse cx="22" cy="46" rx="8" ry="16" fill="#451A03" />
        <ellipse cx="78" cy="46" rx="8" ry="16" fill="#451A03" />
        <circle cx="50" cy="52" r="32" fill="#FED7AA" />
        <path d="M26 44 C26 24 74 24 74 44 Q50 34 26 44 Z" fill="#451A03" />
        <circle cx="41" cy="52" r="4" fill="#1F2937" />
        <circle cx="59" cy="52" r="4" fill="#1F2937" />
        <circle cx="36" cy="58" r="4" fill="#F43F5E" opacity="0.5" />
        <circle cx="64" cy="58" r="4" fill="#F43F5E" opacity="0.5" />
        <path d="M41 64 Q50 73 59 64 Z" fill="#E11D48" />
      </svg>
    ),
  },
  {
    id: 'girl_flowers',
    category: 'girl',
    name: 'Gulli qiz',
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#14B8A6" />
        <circle cx="50" cy="52" r="32" fill="#FEF08A" />
        <path d="M24 46 C24 24 76 24 76 46 Q50 34 24 46 Z" fill="#78350F" />
        {/* Flower */}
        <circle cx="32" cy="30" r="5" fill="#F472B6" />
        <circle cx="32" cy="30" r="2.5" fill="#FEF08A" />
        <circle cx="41" cy="52" r="4" fill="#1F2937" />
        <circle cx="59" cy="52" r="4" fill="#1F2937" />
        <path d="M43 65 Q50 71 57 65" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'girl_smart',
    category: 'girl',
    name: "A'lochi qiz",
    render: (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#F59E0B" />
        <circle cx="50" cy="52" r="32" fill="#FDE68A" />
        {/* Hair */}
        <path d="M26 42 C26 22 74 22 74 42 Q50 28 26 42 Z" fill="#1C1917" />
        {/* Glasses */}
        <circle cx="39" cy="52" r="9" stroke="#BE185D" strokeWidth="2.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="61" cy="52" r="9" stroke="#BE185D" strokeWidth="2.5" fill="rgba(255,255,255,0.4)" />
        <path d="M48 52 L52 52" stroke="#BE185D" strokeWidth="2.5" />
        <circle cx="39" cy="52" r="3" fill="#1F2937" />
        <circle cx="61" cy="52" r="3" fill="#1F2937" />
        <path d="M43 67 Q50 73 57 67" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}
