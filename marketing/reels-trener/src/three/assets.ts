import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

/*
 * Assets the 3D scenes need: the brand typeface as a three.js Font, plus screenshot and logo
 * textures. They are loaded in the ordinary React tree (where Remotion's delayRender holds the
 * frame) and handed down through context — react-three-fiber forwards contexts into its canvas.
 * A delayRender issued from inside the canvas is not seen by the frame capture, so loading
 * there would race the screenshot.
 */

const cache = new Map<string, Promise<unknown>>();

function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = make();
    cache.set(key, p);
  }
  return p;
}

function loadFont(): Promise<Font> {
  return once('font:baloo', async () => {
    const json = await new TTFLoader().loadAsync(staticFile('fonts/Baloo2-ExtraBold.ttf'));
    return new FontLoader().parse(json as Parameters<FontLoader['parse']>[0]);
  });
}

function loadTexture(file: string): Promise<THREE.Texture> {
  return once(`tex:${file}`, async () => {
    const tex = await new THREE.TextureLoader().loadAsync(staticFile(file));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
}

interface Assets {
  font: Font;
  textures: Record<string, THREE.Texture>;
}

const AssetsContext = createContext<Assets | null>(null);

/** Holds the frame until the font and the listed textures are in, then renders its children with them. */
export function AssetsProvider({ textures = [], children }: { textures?: string[]; children: ReactNode }) {
  const key = textures.join('|');
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender(`3D assets ${key}`));
  useEffect(() => {
    let alive = true;
    Promise.all([loadFont(), ...textures.map(loadTexture)])
      .then(([font, ...texs]) => {
        if (!alive) return;
        setAssets({ font, textures: Object.fromEntries(textures.map((f, i) => [f, texs[i]])) });
      })
      .catch((e) => cancelRender(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (assets) continueRender(handle);
  }, [assets, handle]);
  if (!assets) return null;
  return createElement(AssetsContext.Provider, { value: assets }, children);
}

function useAssets(): Assets {
  const a = useContext(AssetsContext);
  if (!a) throw new Error('3D assets are only available inside <AssetsProvider>');
  return a;
}

/** Baloo 2 ExtraBold, parsed from the TTF so headlines can be extruded. */
export function useBaloo(): Font {
  return useAssets().font;
}

/** An image from public/ as a colour texture; it must be in the provider's `textures` list. */
export function useTexture(file: string): THREE.Texture {
  const tex = useAssets().textures[file];
  if (!tex) throw new Error(`Texture ${file} was not listed on <AssetsProvider>`);
  return tex;
}
