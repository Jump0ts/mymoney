import { Colors } from '@/constants/theme';
import { appShellCss, VIEWPORT_CONTENT } from './appShell';

const normalized = appShellCss.replace(/\s+/g, ' ');

describe('viewport', () => {
  it('pinta bajo la muesca y hace que el teclado de Android encoja el area visible', () => {
    expect(VIEWPORT_CONTENT).toContain('width=device-width');
    expect(VIEWPORT_CONTENT).toContain('viewport-fit=cover');
    expect(VIEWPORT_CONTENT).toContain('interactive-widget=resizes-content');
  });

  it('nunca desactiva el zoom: es un fallo de accesibilidad', () => {
    expect(VIEWPORT_CONTENT).not.toContain('user-scalable');
    expect(VIEWPORT_CONTENT).not.toContain('maximum-scale');
  });
});

describe('appShellCss', () => {
  it('el fondo de la pagina es el de la app, en claro y en oscuro', () => {
    expect(normalized).toContain(`html, body { background-color: ${Colors.light.background};`);
    expect(normalized).toContain(
      `@media (prefers-color-scheme: dark) { html, body { background-color: ${Colors.dark.background}; } }`,
    );
  });

  it('no hay rebote que recargue la pagina ni resaltado gris al tocar', () => {
    expect(normalized).toContain('overscroll-behavior-y: none');
    expect(normalized).toContain('-webkit-tap-highlight-color: transparent');
  });

  it('los controles (botones, opciones, casillas, pestanas) no retrasan el toque', () => {
    for (const role of ['button', 'radio', 'checkbox', 'tab']) {
      expect(normalized).toContain(`[role="${role}"]`);
    }
    expect(normalized).toMatch(/touch-action: manipulation/);
  });

  it('una pulsacion larga en un control no selecciona su etiqueta, pero el texto normal si se puede seleccionar', () => {
    const rule = normalized.match(/([^{}]+) \{ user-select: none;[^}]*\}/);

    expect(rule).not.toBeNull();
    expect(rule![0]).toContain('-webkit-touch-callout: none');
    expect(rule![0]).toContain('-webkit-user-select: none');
    // Nada global: ni body ni html ni un selector universal.
    expect(rule![1]).not.toMatch(/(^|,)\s*(html|body|\*)\s*(,|$)/);
  });
});
