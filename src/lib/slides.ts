import { TextBand } from '../types';
import { loadImage } from './utils';

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

/** Quanto da altura do slide o texto pode ocupar. Maior = fonte maior e imagem menor. */
export const BAND_RATIO: Record<TextBand, number> = { m: 0.32, g: 0.40, xg: 0.50 };
const FONT_LADDER = [66, 60, 54, 50, 46, 42, 38, 34, 30, 26];

const FAMILIA = 'Archivo, system-ui, "Segoe UI", Arial, sans-serif';
const font = (size: number) => `500 ${size}px ${FAMILIA}`;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

/** Escolhe o maior corpo de texto que ainda cabe na altura reservada. Nunca corta o texto. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxH: number) {
  let best = { size: FONT_LADDER[0], lines: [] as string[], lh: 0, h: 0 };
  for (const size of FONT_LADDER) {
    ctx.font = font(size);
    const lines = wrapLines(ctx, text, maxW);
    const lh = Math.round(size * 1.32);
    best = { size, lines, lh, h: lines.length * lh };
    if (best.h <= maxH) return best;
  }
  return best;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export interface SlideData {
  imageUrl?: string;
  text: string;
  index: number;
  total: number;
  deckTitle: string;
  band: TextBand;
}

/** Desenha um slide 1920x1080: imagem inteira em cima, texto grande sem serifa embaixo. */
export async function drawSlide(canvas: HTMLCanvasElement, d: SlideData) {
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F2F4F8';
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  const M = 96, TOP = 74, FOOT = 92, GAP = 46;
  const maxW = SLIDE_W - M * 2;

  // O texto ocupa só o que precisa: sobrando espaço, a imagem cresce.
  const maxTextH = Math.round(SLIDE_H * (BAND_RATIO[d.band] || BAND_RATIO.g));
  const fit = fitText(ctx, d.text, maxW, maxTextH);
  const textH = Math.max(96, Math.min(fit.h, Math.round(SLIDE_H * 0.6)));
  const imgH = SLIDE_H - TOP - GAP - textH - FOOT;

  if (d.imageUrl) {
    const img = await loadImage(d.imageUrl);
    const scale = Math.min(maxW / img.naturalWidth, imgH / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (SLIDE_W - w) / 2;
    const y = TOP + (imgH - h) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(26,32,51,.18)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, y, w, h, 12);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  const textTop = TOP + imgH + GAP;
  ctx.fillStyle = '#E85D00';
  roundRect(ctx, M, textTop - 26, 96, 7, 4);
  ctx.fill();

  ctx.fillStyle = '#1A2033';
  ctx.textBaseline = 'top';
  ctx.font = font(fit.size);
  fit.lines.forEach((line, i) => ctx.fillText(line, M, textTop + i * fit.lh));

  ctx.font = `500 26px ${FAMILIA}`;
  ctx.fillStyle = '#55607A';
  if (d.deckTitle) ctx.fillText(d.deckTitle, M, SLIDE_H - 56);
  ctx.textAlign = 'right';
  ctx.fillText(`${d.index + 1} de ${d.total}`, SLIDE_W - M, SLIDE_H - 56);
  ctx.textAlign = 'left';
}

/** Garante que a Archivo esteja carregada antes de medir/desenhar texto no canvas. */
export async function ensureFont() {
  try {
    await (document as any).fonts.load('500 66px Archivo');
    await (document as any).fonts.ready;
  } catch { /* usa a fonte de fallback */ }
}
