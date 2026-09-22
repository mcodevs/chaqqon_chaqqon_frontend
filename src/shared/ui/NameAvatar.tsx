import { useState } from 'react';
import { getAvatarPreset } from './avatarPresets';
import { DigitCharacter } from './DigitCharacter';
import { ImageLightbox } from './ImageLightbox';

interface NameAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /**
   * Lets a tap open the photo full screen. Only a real uploaded photo opens: drawn presets and the
   * digit mascot have nothing more to show at full size.
   */
  zoomable?: boolean;
}

/** Mascot or custom uploaded/preset illustration for student avatar. */
export function NameAvatar({ name, avatarUrl, size = 40, zoomable = false }: NameAvatarProps) {
  const [isZoomed, setIsZoomed] = useState(false);

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
      const photo = (
        <img
          src={avatarUrl}
          alt={name}
          onClick={
            zoomable
              ? (event) => {
                  // The avatar often sits inside a row that has its own click target.
                  event.stopPropagation();
                  setIsZoomed(true);
                }
              : undefined
          }
          title={zoomable ? 'Rasmni katta ko‘rish' : undefined}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'inline-block',
            flexShrink: 0,
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            cursor: zoomable ? 'zoom-in' : undefined,
          }}
        />
      );

      if (!zoomable) return photo;

      return (
        <>
          {photo}
          {isZoomed && (
            <ImageLightbox src={avatarUrl} caption={name} onClose={() => setIsZoomed(false)} />
          )}
        </>
      );
    }
  }

  return <DigitCharacter digit={(name.codePointAt(0) ?? 0) % 10} size={size} />;
}
