import { useMemo } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RoundedBox } from '@react-three/drei';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../ui';
import { useBaloo, useTexture } from './assets';

/*
 * The things the 3D scenes are built from. Sizes are in world units (1 unit = 100 px at z = 0).
 * Nothing here animates by itself: every motion comes from the current Remotion frame.
 */

export function useT() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

export function useIn(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(delay * fps), fps, config: { damping: 14, stiffness: 120, ...config } });
}

// ───────────────────────── materials ─────────────────────────

/** Glossy painted plastic — the look of the whole set. */
export function Plastic({ color, clearcoat = 0.8, roughness = 0.38 }: { color: string; clearcoat?: number; roughness?: number }) {
  return <meshPhysicalMaterial color={color} roughness={roughness} metalness={0.02} clearcoat={clearcoat} clearcoatRoughness={0.25} />;
}

// ───────────────────────── text ─────────────────────────

interface Text3DProps {
  text: string;
  /** Cap height in world units. */
  size: number;
  depth?: number;
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  align?: 'center' | 'left';
  bevel?: number;
  scale?: number;
  opacity?: number;
  /** Widest the lettering may be, in world units; larger text is scaled down to fit. */
  maxWidth?: number;
  roughness?: number;
}

/** Extruded Baloo 2 lettering, centred on its own box. */
export function Text3D({ text, size, depth = 0.45, color = C.ink, position = [0, 0, 0], rotation = [0, 0, 0], align = 'center', bevel = 0.04, scale = 1, opacity = 1, maxWidth, roughness = 0.4 }: Text3DProps) {
  const font = useBaloo();
  const { geometry, width } = useMemo(() => {
    const g = new TextGeometry(text, {
      font,
      size,
      depth,
      curveSegments: 10,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 4,
    });
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const w = b.max.x - b.min.x;
    const h = b.max.y - b.min.y;
    g.translate(align === 'center' ? -b.min.x - w / 2 : -b.min.x, -b.min.y - h / 2, -depth / 2);
    return { geometry: g, width: w };
  }, [font, text, size, depth, bevel, align]);
  const fit = maxWidth ? Math.min(1, maxWidth / width) : 1;
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale * fit} receiveShadow>
      <meshPhysicalMaterial color={color} roughness={roughness} metalness={0.02} clearcoat={0.6} clearcoatRoughness={0.3} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

// ───────────────────────── slabs & tiles ─────────────────────────

/** A rounded block: labels, buttons, steps. */
export function Slab({
  w,
  h,
  d = 0.5,
  color,
  radius,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  children,
}: {
  w: number;
  h: number;
  d?: number;
  color: string;
  radius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children?: React.ReactNode;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[w, h, d]} radius={radius ?? Math.min(w, h) * 0.22} smoothness={6} castShadow receiveShadow>
        <Plastic color={color} />
      </RoundedBox>
      {children}
    </group>
  );
}

/** The app's smiling tile as a little character: a glossy cube with a face on the front. */
export function TileChar({ size = 1.3, color = '#5fb36b', position = [0, 0, 0], squash = 1, rotation = [0, 0, 0] }: { size?: number; color?: string; position?: [number, number, number]; squash?: number; rotation?: [number, number, number] }) {
  const s = size;
  return (
    <group position={position} rotation={rotation} scale={[s * (2 - squash), s * squash, s]}>
      <RoundedBox args={[1, 1, 1]} radius={0.26} smoothness={6} castShadow>
        <Plastic color={color} clearcoat={1} roughness={0.3} />
      </RoundedBox>
      {/* eyes */}
      <mesh position={[-0.17, 0.08, 0.5]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color="#27231b" roughness={0.4} />
      </mesh>
      <mesh position={[0.17, 0.08, 0.5]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color="#27231b" roughness={0.4} />
      </mesh>
      {/* smile: the lower half of a thin torus */}
      <mesh position={[0, -0.08, 0.5]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.16, 0.035, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#27231b" roughness={0.4} />
      </mesh>
      {/* cheeks */}
      <mesh position={[-0.3, -0.06, 0.5]}>
        <circleGeometry args={[0.07, 20]} />
        <meshStandardMaterial color="#f08a8a" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.3, -0.06, 0.5]}>
        <circleGeometry args={[0.07, 20]} />
        <meshStandardMaterial color="#f08a8a" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ───────────────────────── coin ─────────────────────────

/** The logo stamped on both faces of a thick disc. */
export function Coin({ radius = 2.6, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: { radius?: number; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  const tex = useTexture('logo-coin.png');
  const thickness = radius * 0.11;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, thickness, 96]} />
        <meshPhysicalMaterial color="#f6e7c8" roughness={0.3} metalness={0.15} clearcoat={0.8} />
      </mesh>
      {[1, -1].map((side) => (
          <mesh key={side} position={[0, 0, (side * thickness) / 2 + side * 0.002]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
            <circleGeometry args={[radius * 0.985, 96]} />
            <meshPhysicalMaterial map={tex} roughness={0.35} clearcoat={0.9} clearcoatRoughness={0.2} />
          </mesh>
      ))}
      {/* rim */}
      <mesh castShadow>
        <torusGeometry args={[radius, thickness * 0.42, 24, 96]} />
        <meshPhysicalMaterial color="#1a7a34" roughness={0.3} clearcoat={0.9} />
      </mesh>
    </group>
  );
}

// ───────────────────────── star ─────────────────────────

const starShape = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.46;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
})();

export function Star({ size = 1, position = [0, 0, 0], rotation = [0, 0, 0], color = C.gold }: { size?: number; position?: [number, number, number]; rotation?: [number, number, number]; color?: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(starShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4, curveSegments: 4 });
    g.translate(0, 0, -0.175);
    return g;
  }, []);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={size} castShadow>
      <meshPhysicalMaterial color={color} roughness={0.25} metalness={0.5} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
}

// ───────────────────────── abacus ─────────────────────────

/**
 * The app's soroban in three dimensions: a wooden frame around a cream board, five rods, a dark
 * reckoning bar with unit marks, and bicone beads that slide to show each number in `steps`
 * (seconds into the scene). `rodW` is the rod pitch in world units, as in the app's CSS.
 */
export function Abacus3D({ rodW = 1.0, rods = 5, steps, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, digits = true }: { rodW?: number; rods?: number; steps: { t: number; value: number }[]; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; digits?: boolean }) {
  const t = useT();
  const unit = rodW * 0.66;
  const barH = unit * 0.28;
  const pad = unit * 0.45;
  const boardW = rodW * rods;
  const boardH = unit * 2 + barH + unit * 5;
  const readout = digits ? unit * 0.95 : 0;
  const W = boardW + pad * 2;
  const H = boardH + pad * 2 + readout;
  const depth = unit * 0.9;
  const idx = Math.max(0, steps.findLastIndex((s) => s.t <= t));
  const cur = steps[idx];
  const prev = steps[Math.max(0, idx - 1)];
  const k = idx === 0 ? 1 : interpolate(t, [cur.t, cur.t + 0.28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ease = 1 - Math.pow(1 - k, 3);
  const digitsOf = (v: number) => String(v).padStart(rods, '0').slice(-rods).split('').map(Number);
  const a = digitsOf(prev.value);
  const b = digitsOf(cur.value);
  const beadR = rodW * 0.44;
  const beadGeo = useMemo(() => {
    const pts = [new THREE.Vector2(0.02, -0.5), new THREE.Vector2(0.78, -0.24), new THREE.Vector2(1, 0), new THREE.Vector2(0.78, 0.24), new THREE.Vector2(0.02, 0.5)];
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  // y of the board's top edge, in local space (origin at the board centre)
  const top = boardH / 2;
  const heavenY = (d: number) => top - unit / 2 - (d >= 5 ? unit : 0);
  const earthY = (d: number, i: number) => top - unit * 2 - barH - unit * (i + 1) - unit / 2 + (i < d % 5 ? unit : 0);
  const lerp = (f: number, to: number) => f + (to - f) * ease;
  const font = useBaloo();
  const digitGeos = useMemo(() => {
    if (!digits) return null;
    return Array.from({ length: 10 }, (_, n) => {
      const g = new TextGeometry(String(n), { font, size: unit * 0.5, depth: 0.05, curveSegments: 6, bevelEnabled: false });
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
      return g;
    });
  }, [font, unit, digits]);
  const frameColor = C.abacus.frame;
  const boardFront = depth / 2 + unit * 0.04;
  const rodZ = boardFront + beadR * 0.55;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* frame: a rounded block; the board sits proud of its face, beads ride in front of the board */}
      <group position={[0, -readout / 2, 0]}>
        <RoundedBox args={[W, H, depth]} radius={rodW * 0.22} smoothness={6} castShadow receiveShadow>
          <Plastic color={frameColor} clearcoat={0.5} roughness={0.5} />
        </RoundedBox>
      </group>
      {/* board */}
      <mesh position={[0, 0, boardFront - unit * 0.1]} receiveShadow>
        <boxGeometry args={[boardW, boardH, unit * 0.2]} />
        <meshStandardMaterial color={C.abacus.field} roughness={0.75} />
      </mesh>
      {/* bar */}
      <mesh position={[0, top - unit * 2 - barH / 2, rodZ]} castShadow>
        <boxGeometry args={[boardW, barH, beadR * 1.2]} />
        <Plastic color={C.abacus.bar} clearcoat={0.4} roughness={0.5} />
      </mesh>
      {b.map((d, r) => {
        const cx = -boardW / 2 + rodW * (r + 0.5);
        const z = rodZ;
        return (
          <group key={r}>
            <mesh position={[cx, 0, z]}>
              <cylinderGeometry args={[rodW * 0.035, rodW * 0.035, boardH - unit * 0.1, 16]} />
              <meshStandardMaterial color={C.abacus.rod} roughness={0.5} metalness={0.2} />
            </mesh>
            {(rods - 1 - r) % 3 === 0 && (
              <mesh position={[cx, top - unit * 2 - barH / 2, z + beadR * 0.6]}>
                <sphereGeometry args={[rodW * 0.045, 12, 12]} />
                <meshStandardMaterial color={C.abacus.label} roughness={0.5} />
              </mesh>
            )}
            <mesh geometry={beadGeo} position={[cx, lerp(heavenY(a[r]), heavenY(d)), z]} scale={[beadR, unit * 0.98, beadR]} castShadow>
              <Plastic color={d >= 5 ? C.abacus.beadActive : C.abacus.bead} clearcoat={1} roughness={0.28} />
            </mesh>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} geometry={beadGeo} position={[cx, lerp(earthY(a[r], i), earthY(d, i)), z]} scale={[beadR, unit * 0.98, beadR]} castShadow>
                <Plastic color={i < d % 5 ? C.abacus.beadActive : C.abacus.bead} clearcoat={1} roughness={0.28} />
              </mesh>
            ))}
            {digitGeos && (
              <mesh geometry={digitGeos[d]} position={[cx, -boardH / 2 - readout * 0.55, depth / 2 + 0.02]}>
                <meshStandardMaterial color={C.abacus.label} roughness={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ───────────────────────── clock ─────────────────────────

export function Clock3D({ radius = 2.2, position = [0, 0, 0], rotation = [0, 0, 0], t }: { radius?: number; position?: [number, number, number]; rotation?: [number, number, number]; t: number }) {
  const hand = t * Math.PI * 2;
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.5, 72]} />
        <Plastic color="#fff" clearcoat={0.9} roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <torusGeometry args={[radius, 0.16, 20, 72]} />
        <Plastic color={C.accent} clearcoat={1} roughness={0.3} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * radius * 0.82, Math.cos((i / 12) * Math.PI * 2) * radius * 0.82, 0.27]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
          <boxGeometry args={[0.08, 0.26, 0.06]} />
          <meshStandardMaterial color={C.inkSoft} />
        </mesh>
      ))}
      <group rotation={[0, 0, -hand / 12]}>
        <mesh position={[0, radius * 0.28, 0.32]} castShadow>
          <boxGeometry args={[0.14, radius * 0.6, 0.08]} />
          <meshStandardMaterial color={C.ink} />
        </mesh>
      </group>
      <group rotation={[0, 0, -hand]}>
        <mesh position={[0, radius * 0.36, 0.38]} castShadow>
          <boxGeometry args={[0.1, radius * 0.8, 0.08]} />
          <Plastic color={C.accent} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.42]}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
    </group>
  );
}
