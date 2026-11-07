import { Pair, TextBand } from '../types';
import { buildPdf, PdfPage } from './pdf';
import { buildZip, dataUrlToBytes } from './zip';
import { drawSlide, ensureFont, SLIDE_H, SLIDE_W } from './slides';
import { download, safeName, sleep } from './utils';

export const readyPairs = (pairs: Pair[]) => pairs.filter((p) => p.status === 'success' && p.imageUrl);

export async function exportPdf(
  pairs: Pair[],
  opts: { deckTitle: string; band: TextBand },
  onProgress?: (done: number, total: number) => void,
) {
  const done = readyPairs(pairs);
  if (!done.length) return;

  await ensureFont();
  const canvas = document.createElement('canvas');
  const pages: PdfPage[] = [];

  for (let i = 0; i < done.length; i++) {
    onProgress?.(i, done.length);
    await drawSlide(canvas, {
      imageUrl: done[i].imageUrl,
      text: done[i].text,
      index: i,
      total: done.length,
      deckTitle: opts.deckTitle,
      band: opts.band,
    });
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.92));
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: SLIDE_W, h: SLIDE_H });
    await sleep(0); // deixa a interface respirar entre as páginas
  }

  onProgress?.(done.length, done.length);
  download(buildPdf(pages), `${safeName(opts.deckTitle)}.pdf`);
}

export function exportZip(pairs: Pair[], deckTitle: string) {
  const done = readyPairs(pairs);
  if (!done.length) return;
  const files = done.map((p, i) => {
    const { bytes, ext } = dataUrlToBytes(p.imageUrl!);
    return { name: `palacio_${String(i + 1).padStart(2, '0')}.${ext}`, bytes };
  });
  download(buildZip(files), `${safeName(deckTitle)}.zip`);
}
