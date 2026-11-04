// En JavaScript (como scripts/web-headers.test.js) para poder leer ficheros con node:fs sin anadir
// @types/node al proyecto de la app.
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const { BRAND, SIZE, buildIcons, renderMask, outputDir } = require('./generate-icons');
const appConfig = require('../app.config').default;

const readIcon = (name) => fs.readFileSync(path.join(outputDir, name));

/** Decodifica los PNG que escribe el generador (8 bits, sin entrelazado, filtro 0): { width, channels, pixels }. */
const decodePng = (bytes) => {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  const width = bytes.readUInt32BE(16);
  expect(bytes.readUInt32BE(20)).toBe(width); // cuadrado
  expect(bytes[24]).toBe(8);
  const channels = bytes[25] === 6 ? 4 : 3;
  const idatStart = bytes.indexOf('IDAT') + 4;
  const idatLength = bytes.readUInt32BE(idatStart - 8);
  const raw = zlib.inflateSync(bytes.subarray(idatStart, idatStart + idatLength));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * width);
  for (let y = 0; y < width; y += 1) {
    if (raw[y * (stride + 1)] !== 0) throw new Error(`fila ${y}: el generador solo usa el filtro 0`);
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
  }
  return { width, channels, pixels };
};

const pixelAt = ({ width, channels, pixels }, x, y) => Array.from(pixels.subarray((y * width + x) * channels, (y * width + x + 1) * channels));

const hex = ({ r, g, b }) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

describe('iconos nativos', () => {
  const generated = buildIcons();

  it('los PNG del repositorio son exactamente la salida del generador (si cambia, `npm run icons`)', () => {
    for (const [name, png] of Object.entries(generated)) {
      expect(readIcon(name).equals(png)).toBe(true);
    }
  });

  it('la salida es determinista', () => {
    expect(Buffer.from(renderMask(64, 1)).equals(Buffer.from(renderMask(64, 1)))).toBe(true);
  });

  describe('icon.png (iOS y Expo)', () => {
    const icon = decodePng(readIcon('icon.png'));

    it('mide 1024x1024 y es opaco: sin canal alfa, que iOS rechaza', () => {
      expect(icon.width).toBe(1024);
      expect(icon.channels).toBe(3);
    });

    it('es la "M" blanca sobre el indigo de la marca', () => {
      expect(pixelAt(icon, 5, 5)).toEqual([BRAND.r, BRAND.g, BRAND.b]);
      expect(pixelAt(icon, 1018, 1018)).toEqual([BRAND.r, BRAND.g, BRAND.b]);
      // Centro del palo izquierdo de la "M" (x=300 en el lienzo de 1024).
      expect(pixelAt(icon, 300, 500)).toEqual([255, 255, 255]);
      // El hueco entre los palos sigue siendo del color de fondo.
      expect(pixelAt(icon, 512, 380)).toEqual([BRAND.r, BRAND.g, BRAND.b]);
    });
  });

  describe('capas de Android', () => {
    it.each(['android-icon-foreground.png', 'android-icon-monochrome.png'])('%s es 1024x1024 con transparencia', (name) => {
      const layer = decodePng(readIcon(name));
      expect(layer.width).toBe(1024);
      expect(layer.channels).toBe(4);
      expect(pixelAt(layer, 5, 5)[3]).toBe(0); // la esquina no pinta nada
      expect(pixelAt(layer, 300, 500)).toEqual([255, 255, 255, 255]); // el palo de la "M"
    });

    it('la "M" cabe en la zona segura de los iconos adaptativos (circulo central del 66 %)', () => {
      const layer = decodePng(readIcon('android-icon-foreground.png'));
      const safeRadius = (SIZE * 0.66) / 2;
      let outside = 0;
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          const alpha = layer.pixels[(y * SIZE + x) * 4 + 3];
          if (alpha > 0 && Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2) > safeRadius) outside += 1;
        }
      }
      expect(outside).toBe(0);
    });
  });

  describe('splash-icon.png', () => {
    const splash = decodePng(readIcon('splash-icon.png'));

    it('es cuadrado, blanco y con transparencia (va sobre el fondo de la splash)', () => {
      expect(splash.channels).toBe(4);
      expect(pixelAt(splash, 2, 2)[3]).toBe(0);
      let opaque = 0;
      let notWhite = 0;
      for (let i = 0; i < splash.width * splash.width; i += 1) {
        if (splash.pixels[i * 4 + 3] !== 255) continue;
        opaque += 1;
        if (splash.pixels[i * 4] !== 255 || splash.pixels[i * 4 + 1] !== 255 || splash.pixels[i * 4 + 2] !== 255) notWhite += 1;
      }
      expect(opaque).toBeGreaterThan(1000);
      expect(notWhite).toBe(0);
    });

    it('la marca ocupa la mayor parte del lienzo (su ancho en pantalla lo fija app.config.ts)', () => {
      const mask = renderMask(splash.width, 1.55);
      let min = splash.width;
      let max = 0;
      for (let y = 0; y < splash.width; y += 1) {
        for (let x = 0; x < splash.width; x += 1) {
          if (mask[y * splash.width + x] > 0) {
            min = Math.min(min, x);
            max = Math.max(max, x);
          }
        }
      }
      const share = (max - min + 1) / splash.width;
      expect(share).toBeGreaterThan(0.7);
      expect(share).toBeLessThan(0.95);
    });
  });
});

describe('app.config.ts y los iconos', () => {
  const exists = (file) => fs.existsSync(path.resolve(__dirname, '..', file));

  it('apunta a ficheros que existen', () => {
    expect(exists(appConfig.icon)).toBe(true);
    expect(exists(appConfig.android.adaptiveIcon.foregroundImage)).toBe(true);
    expect(exists(appConfig.android.adaptiveIcon.monochromeImage)).toBe(true);
    expect(exists(appConfig.web.favicon)).toBe(true);
    const splash = appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
    expect(exists(splash.image)).toBe(true);
  });

  it('el fondo del icono adaptativo y de la splash es el indigo de la marca', () => {
    const splash = appConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
    expect(appConfig.android.adaptiveIcon.backgroundColor.toLowerCase()).toBe(hex(BRAND));
    expect(splash.backgroundColor.toLowerCase()).toBe(hex(BRAND));
  });

  it('no queda la capa de fondo de imagen del icono por defecto', () => {
    expect(appConfig.android.adaptiveIcon.backgroundImage).toBeUndefined();
    expect(fs.existsSync(path.join(outputDir, 'android-icon-background.png'))).toBe(false);
  });
});
