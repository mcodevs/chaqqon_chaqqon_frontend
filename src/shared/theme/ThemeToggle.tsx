import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import type { ThemePreference } from './theme';
import { useTheme } from './useTheme';

const OPTIONS = [
  { value: 'light' as const, label: '☀️ Yorug‘' },
  { value: 'dark' as const, label: '🌙 Qorong‘i' },
  { value: 'system' as const, label: '💻 Tizim' },
] satisfies readonly { value: ThemePreference; label: string }[];

export function ThemeToggle() {
  const [preference, choose] = useTheme();

  return (
    <SegmentedControl
      label="Ko‘rinish"
      appearance="pill"
      options={OPTIONS}
      value={preference}
      onChange={choose}
    />
  );
}
