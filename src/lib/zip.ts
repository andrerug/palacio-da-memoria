/** ZIP mínimo, sem compressão (método "store"). Sem dependências. */
export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255]);
const u32 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);
const cat = (arrs: Uint8Array[]) => {
  const n = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(n);
  let at = 0;
  for (const a of arrs) { out.set(a, at); at += a.length; }
  return out;
};

export function buildZip(files: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.bytes);
    const local = cat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
                       u32(crc), u32(f.bytes.length), u32(f.bytes.length), u16(name.length), u16(0), name]);
    parts.push(local, f.bytes);
    central.push(cat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
                      u32(crc), u32(f.bytes.length), u32(f.bytes.length), u16(name.length),
                      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length + f.bytes.length;
  }

  const dir = cat(central);
  const end = cat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
                   u32(dir.length), u32(offset), u16(0)]);
  return new Blob([...parts, dir, end], { type: 'application/zip' });
}

/** Converte um data: URL em bytes, devolvendo também a extensão certa. */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } {
  const [meta, b64] = dataUrl.split(',');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, ext: /jpeg|jpg/.test(meta) ? 'jpg' : 'png' };
}
