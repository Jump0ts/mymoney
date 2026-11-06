import { PAY_ENTRY_SCREEN_OPTIONS, PAY_ENTRY_SHEET_DETENTS } from './screen-options';

describe('hoja de pago', () => {
  it('se presenta como hoja nativa con el agarrador visible', () => {
    expect(PAY_ENTRY_SCREEN_OPTIONS.presentation).toBe('formSheet');
    expect(PAY_ENTRY_SCREEN_OPTIONS.sheetGrabberVisible).toBe(true);
  });

  it('conserva la cabecera y el titulo de la pantalla (lo que se ve en la web y en Android)', () => {
    expect(PAY_ENTRY_SCREEN_OPTIONS.headerShown).toBe(true);
    expect(PAY_ENTRY_SCREEN_OPTIONS.title).toBe('Marcar como pagada');
  });

  it('las alturas son fracciones de la pantalla, ascendentes y como mucho tres (limite de Android)', () => {
    expect(PAY_ENTRY_SCREEN_OPTIONS.sheetAllowedDetents).toBe(PAY_ENTRY_SHEET_DETENTS);
    expect(PAY_ENTRY_SHEET_DETENTS.length).toBeGreaterThan(0);
    expect(PAY_ENTRY_SHEET_DETENTS.length).toBeLessThanOrEqual(3);
    PAY_ENTRY_SHEET_DETENTS.forEach((detent, index) => {
      expect(detent).toBeGreaterThan(0);
      expect(detent).toBeLessThanOrEqual(1);
      if (index > 0) expect(detent).toBeGreaterThan(PAY_ENTRY_SHEET_DETENTS[index - 1]);
    });
  });

  it('se puede subir del todo: la ultima altura es la pantalla completa', () => {
    expect(PAY_ENTRY_SHEET_DETENTS[PAY_ENTRY_SHEET_DETENTS.length - 1]).toBe(1);
  });
});
