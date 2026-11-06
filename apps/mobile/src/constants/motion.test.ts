import { CONTENT_FADE_IN, Duration, EASE_IN_OUT_CSS, EASE_OUT_CSS, ROW_EXIT, ROW_REFLOW } from './motion';

describe('motion', () => {
  it('ninguna animacion de interfaz pasa de 300 ms (el latido del skeleton es un bucle, no una transicion)', () => {
    const { pulse, ...ui } = Duration;

    for (const [name, ms] of Object.entries(ui)) {
      expect({ name, ok: ms <= 300 }).toEqual({ name, ok: true });
    }
    expect(pulse).toBe(700);
  });

  it('el feedback de una pulsacion esta entre 100 y 150 ms', () => {
    expect(Duration.press).toBeGreaterThanOrEqual(100);
    expect(Duration.press).toBeLessThanOrEqual(150);
  });

  it('las curvas son las de la skill: salida fuerte y entrada-salida; nunca ease-in', () => {
    expect(EASE_OUT_CSS).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(EASE_IN_OUT_CSS).toBe('cubic-bezier(0.77, 0, 0.175, 1)');
    expect(`${EASE_OUT_CSS}${EASE_IN_OUT_CSS}`).not.toMatch(/ease-in(?!-out)/);
  });

  it('los constructores de layout se crean una vez y comparten duracion con su token', () => {
    expect(CONTENT_FADE_IN).toBeDefined();
    expect(ROW_EXIT).toBeDefined();
    expect(ROW_REFLOW).toBeDefined();
    expect(Duration.content).toBe(Duration.reflow);
  });
});
