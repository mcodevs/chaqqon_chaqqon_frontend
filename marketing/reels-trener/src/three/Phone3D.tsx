import type { ReactNode } from 'react';
import { interpolate } from 'remotion';
import { C, PhoneScreen, useIn, useT } from '../ui';

/*
 * A phone with real thickness, built in CSS 3D so the screen stays pixel-sharp: the body is a
 * stack of rounded layers a couple of pixels apart, which reads as a solid rounded slab from
 * any angle the camera takes here. A blurred ellipse underneath stands in for its floor shadow.
 */

export function Phone3D({
  src,
  top = 700,
  width = 620,
  delay = 0,
  scrollTo = 0,
  scrollFrom = 0,
  scrollDuration = 1,
  rotY = -16,
  rotX = 5,
  rotZ = 0,
  driftY = 6,
  left,
  scale = 1,
  shadow = true,
  children,
}: {
  src: string;
  top?: number;
  width?: number;
  delay?: number;
  scrollTo?: number;
  scrollFrom?: number;
  scrollDuration?: number;
  /** Resting yaw/pitch/roll in degrees; the yaw eases in from a stronger angle. */
  rotY?: number;
  rotX?: number;
  rotZ?: number;
  /** How many degrees of yaw it keeps drifting through over the scene. */
  driftY?: number;
  left?: number;
  scale?: number;
  shadow?: boolean;
  children?: ReactNode;
}) {
  const p = useIn(delay, { damping: 16, stiffness: 80 });
  const t = useT();
  const bezel = Math.round(width * 0.022);
  const outerR = Math.round(width * 0.15);
  const innerR = outerR - bezel;
  const viewport = Math.round(width * 2.1);
  const scroll = interpolate(t, [delay + 0.6, delay + 0.6 + scrollDuration], [scrollFrom, scrollTo], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const layers = 16;
  const step = 2.1;
  const yaw = rotY + (1 - p) * -40 + Math.sin(t * 0.6) * driftY;
  const pitch = rotX + (1 - p) * 12;
  const W = width + bezel * 2;
  const H = viewport + bezel * 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: left ?? (1080 - W) / 2,
        top: top + (1 - p) * 600,
        width: W,
        height: H,
        perspective: 2600,
        perspectiveOrigin: '50% 30%',
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `scale(${scale})`,
        transformOrigin: '50% 0%',
      }}
    >
      {shadow && (
        <div
          style={{
            position: 'absolute',
            left: W * 0.05,
            right: W * 0.05,
            top: H * 0.1,
            height: H * 0.9,
            borderRadius: outerR * 1.6,
            background: 'rgba(60,40,10,0.35)',
            filter: 'blur(48px)',
            transform: `translate(${-yaw * 1.6}px, 70px) scale(0.92, 0.98)`,
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${rotZ}deg)` }}>
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: outerR,
              background: i === 0 ? 'linear-gradient(160deg, #3a3a3f 0%, #121214 40%, #202024 100%)' : i === layers - 1 ? '#1c1c20' : '#101013',
              transform: `translateZ(${-i * step}px)`,
              boxShadow: i === 0 ? 'inset 0 0 0 2px rgba(255,255,255,0.08)' : undefined,
            }}
          />
        ))}
        {/* side buttons, sitting in the body's thickness */}
        {[
          { side: 'left', y: 0.28, h: 0.06 },
          { side: 'left', y: 0.4, h: 0.11 },
          { side: 'left', y: 0.54, h: 0.11 },
          { side: 'right', y: 0.42, h: 0.17 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              [b.side]: -4,
              top: b.y * width,
              width: 4,
              height: b.h * width,
              borderRadius: 2,
              background: '#2a2a2e',
              transform: `translateZ(${(-layers * step) / 2}px)`,
            }}
          />
        ))}
        <div style={{ position: 'absolute', left: bezel, top: bezel, transform: 'translateZ(1px)' }}>
          <PhoneScreen src={src} width={width} viewport={viewport} innerR={innerR} scroll={scroll}>
            {children}
            {/* a soft screen reflection that moves with the yaw */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `linear-gradient(${115 + yaw}deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.14) 48%, rgba(255,255,255,0) 60%)`,
              }}
            />
          </PhoneScreen>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: outerR, boxShadow: `0 ${40 + yaw * 0.4}px 90px rgba(60,40,10,0.25)`, pointerEvents: 'none', opacity: 0 }} />
    </div>
  );
}

export const PHONE_BG = C.page;
