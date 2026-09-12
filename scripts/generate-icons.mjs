// Generador de iconos PWA (U12) — PNG reales sin dependencias nuevas:
// codificador PNG manual (IHDR + IDAT deflate via node:zlib + IEND, CRC-32
// propio). Marca de v1 deliberadamente mínima: fondo ciruela #1a1218 + punto
// rosa #f095c8 centrado (§9.1). Los iconos pulidos son follow-up documentado.
//
//   node scripts/generate-icons.mjs
//
// - icon-192.png / icon-512.png: punto grande (~30 % del lado).
// - icon-maskable-512.png: punto pequeño (~18 %) — la zona segura de un icono
//   maskable es el círculo central del 80 % del lado; la marca vive holgada
//   dentro (spec pwa «Manifest is valid»).

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../public/icons");

const PLUM = { r: 0x1a, g: 0x12, b: 0x18 }; // --color-base
const PINK = { r: 0xf0, g: 0x95, b: 0xc8 }; // --color-accent

// ——— Codificación PNG (color type 6: RGBA, 8 bits) ———

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // 10..12: compression 0, filter 0, interlace 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    scanlines[rowStart] = 0; // filtro None
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ——— Dibujo: fondo sólido + punto centrado con borde suavizado ———

function draw(size, dotRadiusRatio) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const radius = dotRadiusRatio * size;
  // 1 px de antialias en el borde del punto.
  const inner = radius - 0.5;
  const outer = radius + 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let alpha = 0;
      if (dist <= inner) alpha = 1;
      else if (dist < outer) alpha = (outer - dist) / (outer - inner);
      const base = PLUM;
      const r = Math.round(base.r + (PINK.r - base.r) * alpha);
      const g = Math.round(base.g + (PINK.g - base.g) * alpha);
      const b = Math.round(base.b + (PINK.b - base.b) * alpha);
      const i = (y * size + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 0xff;
    }
  }
  return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });
const files = [
  { name: "icon-192.png", png: draw(192, 0.3) },
  { name: "icon-512.png", png: draw(512, 0.3) },
  { name: "icon-maskable-512.png", png: draw(512, 0.18) },
];
for (const { name, png } of files) {
  writeFileSync(resolve(OUT_DIR, name), png);
  process.stdout.write(`✓ public/icons/${name} (${png.length} bytes)\n`);
}
