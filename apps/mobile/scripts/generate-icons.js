// Genera los iconos nativos de la app (iOS, Android, splash) a partir de la misma marca que el PWA
// (assets/images/web-icon.svg: una "M" blanca de trazo redondeado sobre indigo), sin depender de ninguna
// libreria de imagen: dibuja la "M" como un trazo con extremos redondos (suavizado por supersampling) y
// escribe los PNG con zlib. Uso: `npm run icons` desde apps/mobile. La salida es determinista, y
// generate-icons.test.js comprueba que los PNG del repositorio son exactamente esta salida.
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BRAND = { r: 0x4f, g: 0x5d, b: 0xff }; // Colors.light.primary / fondo del PWA
const WHITE = { r: 255, g: 255, b: 255 };

// La "M" de web-icon.svg en su lienzo de 1024: mismo trazo, mismos puntos.
const SIZE = 1024;
const STROKE = 92;
const M_PATH = [
  [300, 700],
  [300, 330],
  [512, 560],
  [724, 330],
  [724, 700],
];
const SAMPLES = 3; // 3x3 muestras por pixel

const distanceToSegment = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/**
 * Cobertura (0..255) de la "M" en cada pixel de un lienzo cuadrado de `size`. `scale` agranda la marca
 * alrededor del centro (1 = igual que en el SVG).
 */
const renderMask = (size = SIZE, scale = 1) => {
  const mask = new Uint8Array(size * size);
  const radius = (STROKE * scale * size) / SIZE / 2;
  const points = M_PATH.map(([x, y]) => [
    ((x - SIZE / 2) * scale + SIZE / 2) * (size / SIZE),
    ((y - SIZE / 2) * scale + SIZE / 2) * (size / SIZE),
  ]);
  const segments = points.slice(1).map((end, i) => [points[i], end]);
  const total = SAMPLES * SAMPLES;

  // Solo se recorre la caja que ocupa la marca (con margen): fuera de ella no hay nada que muestrear.
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const fromX = Math.max(0, Math.floor(Math.min(...xs) - radius - 1));
  const toX = Math.min(size - 1, Math.ceil(Math.max(...xs) + radius + 1));
  const fromY = Math.max(0, Math.floor(Math.min(...ys) - radius - 1));
  const toY = Math.min(size - 1, Math.ceil(Math.max(...ys) + radius + 1));

  for (let y = fromY; y <= toY; y += 1) {
    for (let x = fromX; x <= toX; x += 1) {
      // Lejos del borde el pixel esta entero dentro o entero fuera (la mitad de su diagonal es 0,71): no hace
      // falta muestrear. Solo se suaviza el borde.
      const centre = Math.min(...segments.map(([a, b]) => distanceToSegment(x + 0.5, y + 0.5, a, b)));
      if (centre <= radius - 0.75) {
        mask[y * size + x] = 255;
        continue;
      }
      if (centre > radius + 0.75) continue;

      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (segments.some(([a, b]) => distanceToSegment(px, py, a, b) <= radius)) covered += 1;
        }
      }
      mask[y * size + x] = Math.round((covered / total) * 255);
    }
  }
  return mask;
};

// ---- PNG (RGB o RGBA de 8 bits, sin entrelazado) ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};

const encodePng = (size, channels, pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profundidad
  header[9] = channels === 4 ? 6 : 2; // RGBA o RGB
  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size); // cada fila lleva un byte de filtro (0 = ninguno)
  for (let y = 0; y < size; y += 1) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/**
 * Compone la marca sobre un fondo. `background` = color opaco (sin transparencia: iOS lo exige para el icono)
 * o null para un fondo transparente (capas de Android y splash). `ink` es el color de la "M".
 */
const compose = (mask, size, { background, ink }) => {
  const channels = background ? 3 : 4;
  const pixels = Buffer.alloc(size * size * channels);
  for (let i = 0; i < size * size; i += 1) {
    const a = mask[i] / 255;
    const o = i * channels;
    if (background) {
      pixels[o] = Math.round(background.r + (ink.r - background.r) * a);
      pixels[o + 1] = Math.round(background.g + (ink.g - background.g) * a);
      pixels[o + 2] = Math.round(background.b + (ink.b - background.b) * a);
    } else {
      pixels[o] = ink.r;
      pixels[o + 1] = ink.g;
      pixels[o + 2] = ink.b;
      pixels[o + 3] = mask[i];
    }
  }
  return encodePng(size, channels, pixels);
};

const outputDir = path.resolve(__dirname, '../assets/images');

/** Los iconos nativos: nombre de fichero -> contenido PNG. */
const buildIcons = () => {
  const full = renderMask(SIZE, 1);
  // Splash: la marca llena casi todo el lienzo (el ancho en pantalla lo fija imageWidth en app.config.ts).
  const splash = renderMask(512, 1.55);
  return {
    // iOS: cuadrado opaco (el sistema pone las esquinas).
    'icon.png': compose(full, SIZE, { background: BRAND, ink: WHITE }),
    // Android adaptativo: la "M" cabe en la zona segura (circulo central del 66 %) sobre el color de fondo
    // que da app.config.ts; la capa monocroma es la misma forma para el tinte del sistema.
    'android-icon-foreground.png': compose(full, SIZE, { background: null, ink: WHITE }),
    'android-icon-monochrome.png': compose(full, SIZE, { background: null, ink: WHITE }),
    'splash-icon.png': compose(splash, 512, { background: null, ink: WHITE }),
  };
};

if (require.main === module) {
  for (const [name, png] of Object.entries(buildIcons())) {
    fs.writeFileSync(path.join(outputDir, name), png);
    console.log(`${name}: ${png.length} bytes`);
  }
}

module.exports = { BRAND, SIZE, buildIcons, renderMask, encodePng, outputDir };
