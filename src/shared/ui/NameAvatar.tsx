import { getAvatarPreset } from './avatarPresets';
import { DigitCharacter } from './DigitCharacter';

interface NameAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

/** Mascot or custom uploaded/preset illustration for student avatar. */
export function NameAvatar({ name, avatarUrl, size = 40 }: NameAvatarProps) {
  if (avatarUrl) {
    if (avatarUrl.startsWith('preset:')) {
      const presetId = avatarUrl.slice('preset:'.length);
      const preset = getAvatarPreset(presetId);
      if (preset) {
        return (
          <div style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}>
            {preset.render(size)}
          </div>
        );
      }
    } else {
      return (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'inline-block',
            flexShrink: 0,
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        />
      );
    }
  }

  return <DigitCharacter digit={(name.codePointAt(0) ?? 0) % 10} size={size} />;
}
