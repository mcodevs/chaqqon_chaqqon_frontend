import type { ResultCardData } from './resultCard';

/*
 * The shareable result picture, drawn on a canvas.
 *
 * It deliberately does NOT read the theme tokens. A picture that leaves the app is looked at
 * in someone else's chat, on someone else's phone: it has to be the same warm, light card for
 * everyone, whether the child had dark mode on or not. So this file carries its own palette,
 * the way the abacus illustration does — the brand's green, gold and cream.
 */

const WIDTH = 1080;
/** 4:5 — the tallest shape that is never cropped in a feed, and fits a story with room to spare. */
const HEIGHT = 1350;

const CARD = {
  /* The warm cream of the platform's printed materials. */
  page: '#fdfdef',
  frame: '#3f9d4a',
  frameInner: '#f6b21b',
  panel: '#ffffff',
  panelEdge: '#e8e0cf',
  ink: '#22331f',
  inkSoft: '#5f6b5c',
  score: '#2f8f4e',
  accent: '#e07b15',
} as const;

const DISPLAY = '"Baloo 2", "Nunito", system-ui, sans-serif';
const BODY = '"Nunito", system-ui, sans-serif';

/** Draws the card and hands back a PNG. Throws when the browser cannot give a canvas or a blob. */
export async function drawResultCard(data: ResultCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bu brauzerda rasm chizib bo‘lmadi');

  await loadFonts();

  paintBackground(ctx);
  const markBottom = paintBrandMark(ctx);
  paintHeadline(ctx, data, markBottom);
  paintScorePanel(ctx, data);
  paintFooter(ctx, data);

  return toBlob(canvas);
}

/* ------------------------------------------------------------------ Sections */

function paintBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = CARD.page;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A green wash along the bottom, so the card is not a flat block of cream; the top stays clear
  // for the brand mark.
  const wash = ctx.createLinearGradient(0, HEIGHT * 0.55, 0, HEIGHT);
  wash.addColorStop(0, 'rgba(63, 157, 74, 0)');
  wash.addColorStop(1, 'rgba(63, 157, 74, 0.13)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Double frame, the way the logo is ringed: gold inside green.
  roundedRect(ctx, 20, 20, WIDTH - 40, HEIGHT - 40, 56);
  ctx.strokeStyle = CARD.frame;
  ctx.lineWidth = 10;
  ctx.stroke();

  roundedRect(ctx, 38, 38, WIDTH - 76, HEIGHT - 76, 42);
  ctx.strokeStyle = CARD.frameInner;
  ctx.lineWidth = 4;
  ctx.stroke();
}

/**
 * The platform's mark, drawn rather than loaded: a green badge ringed in gold, the way the old
 * logo was, with the name under it. It fills the same space the logo picture did.
 */
function paintBrandMark(ctx: CanvasRenderingContext2D): number {
  const top = 74;
  const radius = 112;
  const centerY = top + radius + 8;

  ctx.beginPath();
  ctx.arc(WIDTH / 2, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = CARD.frame;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = CARD.frameInner;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `120px ${BODY}`;
  ctx.fillText('⚡', WIDTH / 2, centerY + 6);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = CARD.frame;
  ctx.font = `800 58px ${DISPLAY}`;
  ctx.fillText('Chaqqon-chaqqon', WIDTH / 2, top + 310);
  return top + 330;
}

function paintHeadline(ctx: CanvasRenderingContext2D, data: ResultCardData, top: number): void {
  ctx.textAlign = 'center';

  ctx.fillStyle = CARD.inkSoft;
  ctx.font = `700 32px ${BODY}`;
  ctx.fillText(data.title.toUpperCase(), WIDTH / 2, top + 54);

  ctx.fillStyle = CARD.ink;
  fitText(ctx, data.name, WIDTH / 2, top + 130, WIDTH - 200, 68, DISPLAY, 800);
}

function paintScorePanel(ctx: CanvasRenderingContext2D, data: ResultCardData): void {
  const x = 92;
  const y = 630;
  const w = WIDTH - x * 2;
  const h = 500;

  ctx.save();
  ctx.shadowColor = 'rgba(34, 51, 31, 0.13)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  roundedRect(ctx, x, y, w, h, 48);
  ctx.fillStyle = CARD.panel;
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, x, y, w, h, 48);
  ctx.strokeStyle = CARD.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';

  ctx.fillStyle = CARD.accent;
  fitText(ctx, `${data.badge} ${data.praise}`, WIDTH / 2, y + 96, w - 100, 54, DISPLAY, 800);

  ctx.fillStyle = CARD.score;
  ctx.font = `800 176px ${DISPLAY}`;
  ctx.fillText(`${data.accuracy}%`, WIDTH / 2, y + 268);

  ctx.fillStyle = CARD.ink;
  ctx.font = `700 46px ${BODY}`;
  ctx.fillText(`${data.correct}/${data.total} ta to‘g‘ri`, WIDTH / 2, y + 344);

  ctx.beginPath();
  ctx.moveTo(x + 90, y + 390);
  ctx.lineTo(x + w - 90, y + 390);
  ctx.strokeStyle = CARD.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = CARD.inkSoft;
  fitText(ctx, data.detail, WIDTH / 2, y + 448, w - 100, 36, BODY, 700);
}

function paintFooter(ctx: CanvasRenderingContext2D, data: ResultCardData): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = CARD.frame;
  ctx.font = `800 38px ${DISPLAY}`;
  ctx.fillText('Chaqqon-chaqqon', WIDTH / 2, HEIGHT - 168);

  ctx.fillStyle = CARD.inkSoft;
  ctx.font = `700 30px ${BODY}`;
  // Every teacher's students share these pictures, so the line names the child's own teacher.
  const line = data.teacher ? `Mental arifmetika · ${data.teacher} bilan` : 'Mental arifmetika platformasi';
  fitText(ctx, line, WIDTH / 2, HEIGHT - 118, WIDTH - 200, 30, BODY, 700);
  ctx.font = `700 30px ${BODY}`;
  ctx.fillText(data.date, WIDTH / 2, HEIGHT - 70);
}

/* ------------------------------------------------------------------ Helpers */

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

/** Draws centred text, shrinking it until it fits — a long name must not run off the card. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baseline: number,
  maxWidth: number,
  size: number,
  family: string,
  weight: number,
): void {
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${weight} ${fontSize}px ${family}`;
  }
  ctx.fillText(text, centerX, baseline, maxWidth);
}

/**
 * The web fonts are already on the page, but a canvas only uses a font it can see as loaded.
 * Asking for the exact faces first keeps the picture from falling back to a system font.
 */
async function loadFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  const faces = [`800 176px ${DISPLAY}`, `700 46px ${BODY}`];
  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => undefined)));
  await document.fonts.ready;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Rasmni tayyorlab bo‘lmadi'))),
      'image/png',
    );
  });
}
