import type { CSSProperties, ReactNode } from 'react';
import { loadFont as loadBaloo } from '@remotion/google-fonts/Baloo2';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const { fontFamily: baloo } = loadBaloo('normal', { weights: ['700', '800'], subsets: ['latin'] });
const { fontFamily: nunito } = loadNunito('normal', { weights: ['700', '800'], subsets: ['latin'] });

/** The app's Warm Focus tokens (src/styles/tokens.css). */
export const C = {
  primary: '#1a7a34',
  primaryDark: '#14622a',
  primarySoft: '#e6f4e9',
  accent: '#f58a1f',
  accentSoft: '#fdf0dd',
  page: '#fdf7ee',
  card: '#ffffff',
  soft: '#f8f5f0',
  ink: '#27231b',
  inkSoft: '#5d564a',
  border: '#ece6dd',
  danger: '#cf4436',
  info: '#2d77c9',
  infoSoft: '#e7f1fc',
  gold: '#e0a32b',
  abacus: {
    frame: '#8a5a33',
    frameEdge: '#6b4324',
    field: '#fbf3e7',
    rod: '#cdb094',
    bar: '#7a4f2c',
    bead: '#e0c9a8',
    beadActive: '#e2892c',
    label: '#f7ecdc',
  },
} as const;

export const F = { display: baloo, body: nunito };

/** 0→1 spring that starts `delay` seconds into the current sequence. */
export function useIn(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(delay * fps), fps, config: { damping: 14, stiffness: 120, ...config } });
}

/** Seconds since the current sequence started. */
export function useT() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

/** Fades the scene's content in and out over a few frames, so cuts feel soft. */
export function SceneShell({ duration, children, bg }: { duration: number; children: ReactNode; bg?: ReactNode }) {
  const t = useT();
  const enter = interpolate(t, [0, 0.18], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(t, [duration - 0.22, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      {bg}
      <AbsoluteFill style={{ opacity: Math.min(enter, exit) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

const TILE_COLORS = ['#5fb36b', '#4aa3df', '#f2a541', '#9b6fd6', '#e8c547', '#e46a6a', '#3fae9b', '#f08a8a', '#7cc4d9'];

/**
 * Soft cream page with the app's number tiles drifting slowly across it. Rendered once under
 * the whole video, so the tiles never jump when a scene changes.
 */
export function WarmBackground({ tiles = 9 }: { tiles?: number }) {
  const frame = useCurrentFrame();
  const items = Array.from({ length: tiles }, (_, k) => {
    const x = ((k * 397 + 61) % 1000) / 1000;
    const y = ((k * 613 + 211) % 1000) / 1000;
    return {
      left: 30 + x * 950,
      top: 100 + y * 1700,
      size: 84 + ((k * 37) % 50),
      color: TILE_COLORS[k % TILE_COLORS.length],
      digit: (k * 7 + 3) % 10,
      phase: k * 1.7,
      rot: ((k * 53) % 30) - 15,
    };
  });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, #fffaf2 0%, ${C.page} 55%, #f7ecdc 100%)` }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: it.left + Math.sin(frame / 90 + it.phase) * 16,
            top: it.top + Math.sin(frame / 55 + it.phase) * 26,
            width: it.size,
            height: it.size,
            borderRadius: it.size * 0.3,
            background: it.color,
            opacity: 0.2,
            transform: `rotate(${it.rot + Math.sin(frame / 70 + it.phase) * 6}deg)`,
            boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: it.size * 0.42,
          }}
        >
          {it.digit}
        </div>
      ))}
    </AbsoluteFill>
  );
}

/** Green stage for the brand moments: logo reveal, slogan, end card. */
export function GreenBackground() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% 42%, #2a9a49 0%, ${C.primary} 45%, #0f5524 100%)`, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${frame * 0.25}deg at 50% 42%, rgba(255,255,255,0.07) 0deg 10deg, transparent 10deg 20deg)`,
        }}
      />
    </AbsoluteFill>
  );
}

/** A block that pops in: fades, rises and settles. */
export function Pop({ delay = 0, children, style, from = 40 }: { delay?: number; children: ReactNode; style?: CSSProperties; from?: number }) {
  const p = useIn(delay);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${(1 - p) * from}px) scale(${0.92 + 0.08 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const headline: CSSProperties = {
  fontFamily: F.display,
  fontWeight: 800,
  color: C.ink,
  lineHeight: 1.04,
  textAlign: 'center',
  letterSpacing: -1,
};

export const sub: CSSProperties = {
  fontFamily: F.body,
  fontWeight: 800,
  color: C.inkSoft,
  textAlign: 'center',
  lineHeight: 1.25,
};

/**
 * Baloo 2 carries a tall ascender, so with `line-height: 1` its caps and x-height sit above the
 * middle of the line box. Text inside a box is nudged down to look centred.
 */
export const boxed: CSSProperties = { lineHeight: 1, transform: 'translateY(0.07em)', display: 'inline-block' };

/** A rounded label box: emoji (optional) + display text, both truly centred. */
export function Pill({
  children,
  emoji,
  emojiRight,
  size = 56,
  bg = C.primary,
  color = '#fff',
  shadow,
  radius,
  padX,
  style,
}: {
  children: ReactNode;
  emoji?: string;
  emojiRight?: string;
  size?: number;
  bg?: string;
  color?: string;
  shadow?: string;
  radius?: number;
  padX?: number;
  style?: CSSProperties;
}) {
  const px = padX ?? size * 0.6;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.3,
        padding: `${size * 0.38}px ${px}px`,
        background: bg,
        color,
        borderRadius: radius ?? size * 0.6,
        boxShadow: shadow ?? '0 12px 30px rgba(60,40,10,0.14)',
        fontFamily: F.display,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: -0.5,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {emoji && <span style={{ fontSize: size * 1.05, lineHeight: 1 }}>{emoji}</span>}
      <span style={boxed}>{children}</span>
      {emojiRight && <span style={{ fontSize: size * 1.05, lineHeight: 1 }}>{emojiRight}</span>}
    </div>
  );
}

/** The small white tag that heads each feature scene, like the bullets in the post text. */
export function Badge({ emoji, label, delay = 0, color = C.primary }: { emoji: string; label: string; delay?: number; color?: string }) {
  const p = useIn(delay, { damping: 12 });
  return (
    <div style={{ transform: `scale(${p})` }}>
      <Pill emoji={emoji} size={38} bg={C.card} color={color} padX={28} radius={999} shadow="0 10px 30px rgba(60,40,10,0.12)">
        {label}
      </Pill>
    </div>
  );
}

/** A white card row: icon in a tinted square, text beside it. Used by the lists in several scenes. */
export function IconRow({
  emoji,
  tint,
  color = C.ink,
  size = 52,
  children,
  right,
  style,
}: {
  emoji: string;
  tint: string;
  color?: string;
  size?: number;
  children: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  const icon = size * 1.75;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.5,
        background: C.card,
        borderRadius: size * 0.6,
        padding: `${size * 0.42}px ${size * 0.55}px`,
        boxShadow: '0 14px 36px rgba(60,40,10,0.12)',
        ...style,
      }}
    >
      <span
        style={{
          width: icon,
          height: icon,
          borderRadius: icon * 0.3,
          background: tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: icon * 0.56,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {emoji}
      </span>
      <span style={{ ...headline, ...boxed, fontSize: size, color, textAlign: 'left', whiteSpace: 'nowrap' }}>{children}</span>
      {right && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>{right}</span>}
    </div>
  );
}

// ───────────────────────── phone ─────────────────────────

const SHOT = { w: 1080, h: 2338 };
export const STATUS_H = 64;

/**
 * A phone showing one of the captured app screens. The capture has no status bar, so one is
 * drawn above it in the app's page colour; the island sits in it like on a real device.
 */
export function Phone({
  src,
  top = 700,
  width = 640,
  delay = 0,
  scrollTo = 0,
  scrollFrom = 0,
  scrollDuration = 1,
  children,
}: {
  src: string;
  top?: number;
  width?: number;
  delay?: number;
  /** For full-page captures: how far to pan, as a fraction of the extra height. */
  scrollTo?: number;
  scrollFrom?: number;
  scrollDuration?: number;
  children?: ReactNode;
}) {
  const p = useIn(delay, { damping: 16, stiffness: 90 });
  const t = useT();
  const bezel = Math.round(width * 0.022);
  const outerR = Math.round(width * 0.15);
  const innerR = outerR - bezel;
  const viewport = Math.round(width * 2.1);
  const scroll = interpolate(t, [delay + 0.6, delay + 0.6 + scrollDuration], [scrollFrom, scrollTo], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const btn = (side: 'left' | 'right', y: number, h: number) => (
    <div
      key={`${side}${y}`}
      style={{
        position: 'absolute',
        [side]: -5,
        top: y,
        width: 5,
        height: h,
        borderRadius: 3,
        background: '#2a2a2e',
      }}
    />
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - width - bezel * 2) / 2,
        top: top + (1 - p) * 500,
        width: width + bezel * 2,
        height: viewport + bezel * 2,
        borderRadius: outerR,
        background: 'linear-gradient(160deg, #3a3a3f 0%, #121214 40%, #202024 100%)',
        padding: bezel,
        boxShadow: '0 40px 90px rgba(60,40,10,0.3), 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.08)',
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
      }}
    >
      {btn('left', width * 0.28, width * 0.06)}
      {btn('left', width * 0.4, width * 0.11)}
      {btn('left', width * 0.54, width * 0.11)}
      {btn('right', width * 0.42, width * 0.17)}
      <PhoneScreen src={src} width={width} viewport={viewport} innerR={innerR} scroll={scroll}>
        {children}
      </PhoneScreen>
    </div>
  );
}

/** The screen itself: status bar, island, the (optionally panned) capture and any overlay. */
export function PhoneScreen({ src, width, viewport, innerR, scroll, children }: { src: string; width: number; viewport: number; innerR: number; scroll: number; children?: ReactNode }) {
  const shotH = (width * SHOT.h) / SHOT.w;
  const overflow = Math.max(0, shotH + STATUS_H - viewport);
  return (
  <div style={{ width, height: viewport, borderRadius: innerR, overflow: 'hidden', position: 'relative', background: C.page }}>
      <Img src={staticFile(src)} style={{ width, position: 'absolute', top: STATUS_H - scroll * overflow, left: 0 }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: STATUS_H,
          background: C.page,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${width * 0.07}px`,
          fontFamily: F.body,
          fontWeight: 800,
          fontSize: width * 0.036,
          color: C.ink,
        }}
      >
        <span>9:41</span>
        <StatusIcons size={width * 0.03} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          width: width * 0.27,
          height: width * 0.075,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background: '#0b0b0d',
        }}
      />
      {children}
    </div>
  );
}

function StatusIcons({ size }: { size: number }) {
  return (
    <svg width={size * 4.2} height={size * 1.2} viewBox="0 0 84 24">
      <rect x="0" y="14" width="4" height="8" rx="1" fill={C.ink} />
      <rect x="6" y="10" width="4" height="12" rx="1" fill={C.ink} />
      <rect x="12" y="6" width="4" height="16" rx="1" fill={C.ink} />
      <rect x="18" y="2" width="4" height="20" rx="1" fill={C.ink} />
      <path d="M30 10 a14 14 0 0 1 20 0 M34 14 a9 9 0 0 1 12 0 M38 18 a4 4 0 0 1 4 0" stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="56" y="4" width="24" height="16" rx="4" stroke={C.ink} strokeWidth="2" fill="none" />
      <rect x="59" y="7" width="16" height="10" rx="2" fill={C.ink} />
      <rect x="81" y="9" width="2.5" height="6" rx="1" fill={C.ink} />
    </svg>
  );
}

export function Logo({ size, delay = 0 }: { size: number; delay?: number }) {
  const p = useIn(delay, { damping: 11, stiffness: 110 });
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25), 0 0 0 10px rgba(255,255,255,0.35)',
        overflow: 'hidden',
        transform: `scale(${0.55 + 0.45 * p}) rotate(${(1 - p) * -18}deg)`,
      }}
    >
      <Img src={staticFile('logo.webp')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

// ───────────────────────── abacus ─────────────────────────

/**
 * The app's soroban (src/shared/ui/Soroban.tsx), drawn the same way: a frame around a cream
 * field, two bands for the 5-bead and the four 1-beads, a dark bar with unit marks, flattened
 * bicone beads that slide along the rod, and the digit readout under the field. `steps` are
 * the numbers it shows over time (seconds into the scene); beads glide to each new number.
 */
export function Abacus({ rodW = 100, steps, rods = 5, digits = true }: { rodW?: number; steps: { t: number; value: number }[]; rods?: number; digits?: boolean }) {
  const t = useT();
  const unit = rodW * 0.66;
  const barH = unit * 0.28;
  const pad = unit * 0.45;
  const boardW = rodW * rods;
  const boardH = unit * 2 + barH + unit * 5;
  const readout = digits ? unit * 0.95 : 0;
  const W = boardW + pad * 2;
  const H = boardH + pad * 2 + readout;
  const idx = Math.max(0, steps.findLastIndex((s) => s.t <= t));
  const cur = steps[idx];
  const prev = steps[Math.max(0, idx - 1)];
  const k = idx === 0 ? 1 : interpolate(t, [cur.t, cur.t + 0.28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ease = 1 - Math.pow(1 - k, 3);
  const digitsOf = (v: number) => String(v).padStart(rods, '0').slice(-rods).split('').map(Number);
  const a = digitsOf(prev.value);
  const b = digitsOf(cur.value);
  const beadW = rodW * 0.88;
  const beadH = unit;
  const rodLine = Math.max(2, rodW * 0.07);

  const bead = (cx: number, cy: number, active: boolean, key: string) => {
    const x = cx - beadW / 2;
    const y = cy - beadH / 2;
    const pts = [
      [0.5, 0],
      [0.88, 0.26],
      [1, 0.5],
      [0.88, 0.74],
      [0.5, 1],
      [0.12, 0.74],
      [0, 0.5],
      [0.12, 0.26],
    ]
      .map(([px, py]) => `${x + px * beadW},${y + py * beadH}`)
      .join(' ');
    return <polygon key={key} points={pts} fill={active ? 'url(#beadOn)' : 'url(#beadOff)'} filter="url(#beadShadow)" />;
  };

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="beadOff" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0e2cb" />
          <stop offset="0.48" stopColor={C.abacus.bead} />
          <stop offset="1" stopColor="#b09c82" />
        </linearGradient>
        <linearGradient id="beadOn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3b074" />
          <stop offset="0.48" stopColor={C.abacus.beadActive} />
          <stop offset="1" stopColor="#b06a22" />
        </linearGradient>
        <filter id="beadShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>
      {/* frame */}
      <rect x="0" y="0" width={W} height={H} rx={rodW * 0.24} fill={C.abacus.frame} stroke={C.abacus.frameEdge} strokeWidth="3" />
      {/* field */}
      <rect x={pad} y={pad} width={boardW} height={boardH} rx={rodW * 0.12} fill={C.abacus.field} />
      {/* rods */}
      {b.map((_, r) => {
        const cx = pad + rodW * (r + 0.5);
        return (
          <g key={`rod${r}`}>
            <rect x={cx - rodLine / 2} y={pad} width={rodLine} height={unit * 2} fill={C.abacus.rod} />
            <rect x={cx - rodLine / 2} y={pad + unit * 2 + barH} width={rodLine} height={unit * 5 - unit * 0.12} fill={C.abacus.rod} />
          </g>
        );
      })}
      {/* bar with unit marks every third rod from the ones */}
      <rect x={pad} y={pad + unit * 2} width={boardW} height={barH} fill={C.abacus.bar} />
      <rect x={pad} y={pad + unit * 2} width={boardW} height="1.5" fill="rgba(255,255,255,0.18)" />
      {b.map((_, r) =>
        (rods - 1 - r) % 3 === 0 ? (
          <circle key={`dot${r}`} cx={pad + rodW * (r + 0.5)} cy={pad + unit * 2 + barH / 2} r={Math.max(3, rodW * 0.05)} fill={C.abacus.label} opacity="0.85" />
        ) : null,
      )}
      {/* beads */}
      {b.map((d, r) => {
        const cx = pad + rodW * (r + 0.5);
        const heavenY = (digit: number) => pad + unit / 2 + (digit >= 5 ? unit : 0);
        const earthY = (digit: number, i: number) => pad + unit * 2 + barH + unit * (i + 1) + unit / 2 - (i < digit % 5 ? unit : 0);
        const lerp = (from: number, to: number) => from + (to - from) * ease;
        return (
          <g key={`beads${r}`}>
            {bead(cx, lerp(heavenY(a[r]), heavenY(d)), d >= 5, `h${r}`)}
            {[0, 1, 2, 3].map((i) => bead(cx, lerp(earthY(a[r], i), earthY(d, i)), i < d % 5, `e${r}${i}`))}
          </g>
        );
      })}
      {digits &&
        b.map((d, r) => (
          <text
            key={`d${r}`}
            x={pad + rodW * (r + 0.5)}
            y={pad + boardH + readout * 0.74}
            textAnchor="middle"
            fontFamily={F.display}
            fontWeight="800"
            fontSize={unit * 0.6}
            fill={C.abacus.label}
            opacity="0.9"
          >
            {d}
          </text>
        ))}
    </svg>
  );
}
