/**
 * Gerador de PDF mínimo: uma página = um JPEG de página inteira.
 * Sem dependências — o slide já é desenhado em canvas, então só falta empacotar.
 */
export interface PdfPage {
  bytes: Uint8Array;
  w: number;
  h: number;
}

export function buildPdf(pages: PdfPage[], pageW = 960, pageH = 540): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let len = 0;
  const push = (d: string | Uint8Array) => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    chunks.push(b);
    len += b.length;
  };
  const offs: Record<number, number> = {};
  const obj = (n: number, body: string) => {
    offs[n] = len;
    push(`${n} 0 obj\n`);
    push(body);
    push('\nendobj\n');
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const n = pages.length;
  const pageNum = (i: number) => 3 + i * 3;
  const kids = Array.from({ length: n }, (_, i) => `${pageNum(i)} 0 R`).join(' ');

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [ ${kids} ] >>`);

  pages.forEach((jp, i) => {
    const p = pageNum(i), c = p + 1, im = p + 2;
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
           `/Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`);
    const stream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    obj(c, `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);

    offs[im] = len;
    push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${jp.w} /Height ${jp.h} ` +
         `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jp.bytes.length} >>\nstream\n`);
    push(jp.bytes);
    push('\nendstream\nendobj\n');
  });

  const total = 2 + n * 3;
  const xref = len;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= total; i++) table += `${String(offs[i]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(len);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return new Blob([out], { type: 'application/pdf' });
}
