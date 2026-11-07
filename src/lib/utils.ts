import { SplitMode } from '../types';

export const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id' + Math.random().toString(36).slice(2) + Date.now();

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ordena por nome com números naturais: foto2 vem antes de foto10. */
export const sortFiles = (files: File[]): File[] =>
  files.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }));

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Falha ao carregar a imagem.'));
    i.src = src;
  });

/** Divide o texto colado em itens, conforme o separador escolhido. */
export function splitItems(raw: string, mode: SplitMode): string[] {
  const t = String(raw || '').replace(/\r\n/g, '\n');
  const parts =
    mode === 'blank' ? t.split(/\n\s*\n+/) :
    mode === 'dash'  ? t.split(/^\s*-{3,}\s*$/m) :
                       t.split('\n');
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const safeName = (s: string) => (s || 'palacio-da-memoria').replace(/[\\/:*?"<>|]/g, '-').trim();
