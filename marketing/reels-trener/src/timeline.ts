/*
 * Scene boundaries, in seconds of the voice-over (public/voice.m4a).
 * Taken from Whisper word timestamps; each scene starts just before its first word.
 */
export const FPS = 30;
export const DURATION_S = 84;

export const SCENES = {
  hook: [0, 3.6],
  question: [3.6, 8.45],
  logo: [8.45, 12.6],
  platform: [12.6, 19.5],
  tasavvur: [19.5, 24.85],
  flash: [24.85, 29.35],
  abakus: [29.35, 35.35],
  yozma: [35.35, 42.05],
  uyVazifa: [42.05, 49.85],
  reyting: [49.85, 53.8],
  qismi: [53.8, 57.45],
  vaqt: [57.45, 61.7],
  imkoniyat: [61.7, 65.2],
  tayyor: [65.2, 69.65],
  slogan: [69.65, 74.1],
  final: [74.1, 79.4],
  end: [79.4, DURATION_S],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;

/** Seconds since the scene started at which a word is spoken. */
export const at = (scene: SceneId, absolute: number) => absolute - SCENES[scene][0];
