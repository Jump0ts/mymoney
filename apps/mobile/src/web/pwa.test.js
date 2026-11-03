// En JavaScript (como scripts/web-headers.test.js) para poder leer ficheros con node:fs sin anadir
// @types/node al proyecto de la app, que solo tipa TypeScript de React Native.
const fs = require('node:fs');
const path = require('node:path');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const { Colors } = require('@/constants/theme');
const { default: PwaHead, PWA_THEME_COLOR } = require('./PwaHead');

const publicDir = path.resolve(__dirname, '../../public');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));

/** Ancho y alto de un PNG, leidos de la cabecera IHDR (sin depender de librerias de imagen). */
const pngSize = (file) => {
  const bytes = fs.readFileSync(path.join(publicDir, file));
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

describe('manifest.json', () => {
  it('se abre como app independiente en la raiz', () => {
    expect(manifest).toMatchObject({ name: 'MyMoney', start_url: '/', scope: '/', display: 'standalone', lang: 'es' });
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('usa los colores del tema claro de la app', () => {
    expect(manifest.background_color).toBe(Colors.light.background);
    expect(manifest.theme_color).toBe(Colors.light.background);
  });

  it('declara iconos que existen y miden lo que dicen', () => {
    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(icon.src.startsWith('/')).toBe(true);
      expect(pngSize(icon.src.slice(1))).toEqual({ width, height });
    }
  });

  it('incluye iconos de 192 y 512 px y uno enmascarable', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});

describe('icono de iOS', () => {
  it('mide 180x180', () => {
    expect(pngSize('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });
});

describe('PwaHead', () => {
  const html = renderToStaticMarkup(createElement(PwaHead));

  it('enlaza el manifest y el icono de iOS', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.json"/>');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>');
  });

  it('pide abrirse a pantalla completa con nombre propio', () => {
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="MyMoney"');
  });

  it('cambia el color de la barra del sistema con el modo claro u oscuro', () => {
    expect(html).toContain(`content="${Colors.light.background}" media="(prefers-color-scheme: light)"`);
    expect(html).toContain(`content="${Colors.dark.background}" media="(prefers-color-scheme: dark)"`);
  });

  it('mantiene sus colores en sincronia con el tema', () => {
    expect(PWA_THEME_COLOR).toEqual({ light: Colors.light.background, dark: Colors.dark.background });
  });
});
