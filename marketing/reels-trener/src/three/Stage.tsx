import type { ReactNode } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { RoundedBox } from '@react-three/drei';
import { AssetsProvider } from './assets';

/*
 * The studio every 3D scene is shot in. The camera sits 35.84 units back with a 30° lens, so
 * at z = 0 one world unit is exactly 100 px of the 1080×1920 frame: `px()` converts.
 */

export const CAMERA_Z = 35.84;

/** Pixel coordinates (x from the left, y from the top) to world units at z = 0. */
export const px = (x: number, y: number): [number, number] => [(x - 540) / 100, (960 - y) / 100];

export function Stage({
  children,
  floorY = -11,
  shadow = true,
  textures,
}: {
  children: ReactNode;
  floorY?: number;
  shadow?: boolean;
  textures?: string[];
}) {
  const { width, height } = useVideoConfig();
  return (
    <AssetsProvider textures={textures}>
      <ThreeCanvas
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0 }}
        camera={{ fov: 30, position: [0, 0, CAMERA_Z], near: 1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        shadows="soft"
        flat
        dpr={1}
      >
        <ambientLight intensity={0.95} color="#fff6ea" />
        <directionalLight
          position={[9, 16, 20]}
          intensity={1.9}
          color="#fff4e0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-camera-near={1}
          shadow-camera-far={80}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-12, 6, 14]} intensity={0.55} color="#dbeafe" />
        <directionalLight position={[0, -8, 10]} intensity={0.25} color="#ffe9c7" />
        {shadow && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
            <planeGeometry args={[80, 80]} />
            <shadowMaterial transparent opacity={0.22} color="#3a2a12" />
          </mesh>
        )}
        {children}
      </ThreeCanvas>
    </AssetsProvider>
  );
}

const TILE_COLORS = ['#5fb36b', '#4aa3df', '#f2a541', '#9b6fd6', '#e8c547', '#e46a6a', '#3fae9b', '#f08a8a'];

/** Glossy number-tile cubes drifting far behind the action, the 3D cousin of the app's tiles. */
export function FloatingTiles({ count = 8, depth = -14 }: { count?: number; depth?: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }, (_, k) => {
        const x = (((k * 397 + 61) % 1000) / 1000 - 0.5) * 22;
        const y = (((k * 613 + 211) % 1000) / 1000 - 0.5) * 34;
        const size = 1.1 + ((k * 37) % 50) / 60;
        const ph = k * 1.7;
        return (
          <RoundedBox
            key={k}
            args={[size, size, size]}
            radius={size * 0.22}
            smoothness={5}
            position={[
              x + Math.sin(frame / 90 + ph) * 0.4,
              y + Math.sin(frame / 55 + ph) * 0.6,
              depth - (k % 3) * 2,
            ]}
            rotation={[frame / 200 + ph, frame / 160 + ph, 0]}
          >
            <meshStandardMaterial
              color={TILE_COLORS[k % TILE_COLORS.length]}
              roughness={0.35}
              metalness={0.05}
              transparent
              opacity={0.55}
            />
          </RoundedBox>
        );
      })}
    </>
  );
}
