import { AbsoluteFill } from 'remotion';
import { WarmBackground } from './ui';
import { FloatingTiles, Stage, px } from './three/Stage';
import { Abacus3D, Coin, Slab, Star, Text3D, TileChar, useT } from './three/objects';

/** A smoke test: every 3D building block on one frame. */
export function Test3D() {
  const t = useT();
  return (
    <AbsoluteFill>
      <WarmBackground />
      <Stage textures={['logo-coin.png']}>
        <FloatingTiles />
        <Text3D text="MENTAL ARIFMETIKA" size={1.0} color="#1a7a34" position={[...px(540, 300), 0]} />
        <Slab w={7} h={1.6} color="#f58a1f" position={[...px(540, 500), 0]} rotation={[0, 0, -0.04]}>
          <Text3D text="ajoyib yangilik!" size={0.72} color="#fff" position={[0, 0, 0.3]} depth={0.2} />
        </Slab>
        <Abacus3D rodW={1.05} steps={[{ t: 0, value: 2026 }]} position={[...px(540, 1150), 0]} rotation={[0.1, Math.sin(t) * 0.3, 0]} />
        <Coin radius={1.6} position={[...px(200, 1650), 0]} rotation={[0, 0.5, 0]} />
        <TileChar position={[...px(540, 1650), 0]} />
        <Star size={1} position={[...px(880, 1650), 0]} rotation={[0, 0.3, 0.2]} />
      </Stage>
    </AbsoluteFill>
  );
}
