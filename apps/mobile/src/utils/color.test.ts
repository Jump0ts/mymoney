import {
  areaToSv,
  contrastRatio,
  getReadableTextColor,
  hexToHsv,
  hsvToHex,
  legibleColor,
  MIN_VISIBLE_CONTRAST,
  normalizeHex,
  svToArea,
} from './color';

// Los 10 colores de la paleta de categorias y grupos de la app.
const PALETTE = ['#4F5DFF', '#1FA971', '#E5484D', '#F5A623', '#9B59B6', '#17A2B8', '#EA738D', '#6C5CE7', '#2ECC71', '#7F8C8D'];

// 4096 colores repartidos por todo el espacio RGB (pasos de 17 por canal).
const grid = (): string[] => {
  const steps = Array.from({ length: 16 }, (_, i) => i * 17);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return steps.flatMap((r) => steps.flatMap((g) => steps.map((b) => `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase())));
};

describe('getReadableTextColor', () => {
  it('usa texto blanco sobre fondos oscuros', () => {
    expect(getReadableTextColor('#000000')).toBe('#FFFFFF');
    expect(getReadableTextColor('#4F5DFF')).toBe('#FFFFFF');
    expect(getReadableTextColor('#9B59B6')).toBe('#FFFFFF');
  });

  it('usa texto negro sobre fondos claros', () => {
    expect(getReadableTextColor('#FFFFFF')).toBe('#000000');
    expect(getReadableTextColor('#F5A623')).toBe('#000000');
    expect(getReadableTextColor('#2ECC71')).toBe('#000000');
  });

  it('elige siempre un contraste de al menos 4.5:1 con las paletas de categorias', () => {
    const palette = ['#4F5DFF', '#1FA971', '#E5484D', '#F5A623', '#9B59B6', '#17A2B8', '#EA738D', '#6C5CE7', '#2ECC71', '#7F8C8D'];
    const lum = (hex: string) => {
      const ch = (v: number) => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(parseInt(hex.slice(1, 3), 16)) + 0.7152 * ch(parseInt(hex.slice(3, 5), 16)) + 0.0722 * ch(parseInt(hex.slice(5, 7), 16));
    };

    for (const bg of palette) {
      const fg = getReadableTextColor(bg);
      const [hi, lo] = [Math.max(lum(bg), lum(fg)), Math.min(lum(bg), lum(fg))];
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('normalizeHex', () => {
  it.each([
    ['#1a2b3c', '#1A2B3C'],
    ['1A2B3C', '#1A2B3C'],
    ['  #1a2b3c  ', '#1A2B3C'],
    ['#abc', '#AABBCC'],
    ['abc', '#AABBCC'],
    ['#FFF', '#FFFFFF'],
    ['#000', '#000000'],
  ])('%j -> %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each(['', '#', '#12', '#1234', '#12345', '#1234567', '#GGGGGG', 'rojo', '##123456', '#12 345', '12345g'])(
    'rechaza %j',
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    },
  );
});

describe('hexToHsv / hsvToHex', () => {
  it('reconoce los colores primarios y los grises', () => {
    expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00FF00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('#0000FF')).toEqual({ h: 240, s: 1, v: 1 });
    expect(hexToHsv('#FFFF00')).toEqual({ h: 60, s: 1, v: 1 });
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
    expect(hexToHsv('#FFFFFF')).toEqual({ h: 0, s: 0, v: 1 });
    expect(hexToHsv('#808080')).toMatchObject({ s: 0 });
  });

  it('convierte de vuelta a hex', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00FF00');
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000FF');
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 200, s: 0.5, v: 0 })).toBe('#000000');
    expect(hsvToHex({ h: 0, s: 0, v: 0.5 })).toBe('#808080');
  });

  it('el matiz da la vuelta: 360 es 0 y los negativos entran por el otro lado', () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: -120, s: 1, v: 1 })).toBe('#0000FF');
    expect(hsvToHex({ h: 480, s: 1, v: 1 })).toBe('#00FF00');
  });

  it('ida y vuelta devuelve el mismo color para una malla de 4096 colores', () => {
    for (const color of grid()) expect(hsvToHex(hexToHsv(color))).toBe(color);
  });

  it('ida y vuelta tambien con colores de la paleta y de la marca', () => {
    for (const color of PALETTE) expect(hsvToHex(hexToHsv(color))).toBe(color);
  });
});

describe('contrastRatio', () => {
  it('blanco sobre negro es 21 y un color consigo mismo es 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#4F5DFF', '#4F5DFF')).toBe(1);
  });

  it('es simetrico', () => {
    expect(contrastRatio('#4F5DFF', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#4F5DFF'), 10);
  });
});

describe('legibleColor', () => {
  const LIGHT_CARD = '#FFFFFF';
  const DARK_CARD = '#1A1B22';

  it('deja el color igual si se distingue del fondo', () => {
    expect(legibleColor('#4F5DFF', LIGHT_CARD)).toBe('#4F5DFF');
    expect(legibleColor('#4F5DFF', DARK_CARD)).toBe('#4F5DFF');
    expect(legibleColor('#1FA971', LIGHT_CARD)).toBe('#1FA971');
  });

  it('oscurece un casi blanco sobre una tarjeta clara, conservando el tono', () => {
    const result = legibleColor('#FFF5D6', LIGHT_CARD);

    expect(result).not.toBe('#FFF5D6');
    expect(contrastRatio(result, LIGHT_CARD)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
    expect(Math.abs(hexToHsv(result).h - hexToHsv('#FFF5D6').h)).toBeLessThan(12);
  });

  it('aclara un casi negro sobre una tarjeta oscura', () => {
    const result = legibleColor('#0A0A12', DARK_CARD);

    expect(result).not.toBe('#0A0A12');
    expect(contrastRatio(result, DARK_CARD)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
  });

  it('un color claro sobre fondo oscuro y uno oscuro sobre fondo claro no se tocan', () => {
    expect(legibleColor('#F5F6FA', DARK_CARD)).toBe('#F5F6FA');
    expect(legibleColor('#12131A', LIGHT_CARD)).toBe('#12131A');
  });

  it('el blanco sobre blanco acaba en un gris visible y el negro sobre negro, en uno claro', () => {
    expect(contrastRatio(legibleColor('#FFFFFF', LIGHT_CARD), LIGHT_CARD)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
    expect(contrastRatio(legibleColor('#000000', '#000000'), '#000000')).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
  });

  it('respeta un contraste minimo distinto', () => {
    expect(contrastRatio(legibleColor('#F1C40F', LIGHT_CARD, 4.5), LIGHT_CARD)).toBeGreaterThanOrEqual(4.5);
  });

  it('ningun color de una malla de 4096 se pierde sobre las tarjetas clara y oscura', () => {
    for (const color of grid()) {
      for (const card of [LIGHT_CARD, DARK_CARD]) {
        const result = legibleColor(color, card);
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
        expect(contrastRatio(result, card)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST - 0.001);
      }
    }
  });

  it('no toca los colores de la paleta de la app sobre las tarjetas clara y oscura', () => {
    for (const color of PALETTE) {
      expect(legibleColor(color, DARK_CARD)).toBe(color);
      expect(legibleColor(color, LIGHT_CARD)).toBe(color);
    }
  });
});

describe('areaToSv / svToArea', () => {
  it('la esquina superior derecha es saturacion y brillo maximos; la inferior izquierda, brillo 0', () => {
    expect(areaToSv(200, 0, 200, 100)).toEqual({ s: 1, v: 1 });
    expect(areaToSv(0, 100, 200, 100)).toEqual({ s: 0, v: 0 });
    expect(areaToSv(0, 0, 200, 100)).toEqual({ s: 0, v: 1 });
  });

  it('recorta lo que cae fuera del area', () => {
    expect(areaToSv(-50, -10, 200, 100)).toEqual({ s: 0, v: 1 });
    expect(areaToSv(999, 999, 200, 100)).toEqual({ s: 1, v: 0 });
  });

  it('un area sin tamano no divide por cero', () => {
    expect(areaToSv(10, 10, 0, 0)).toEqual({ s: 0, v: 0 });
  });

  it('svToArea es la inversa', () => {
    const { x, y } = svToArea(0.25, 0.8, 200, 100);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(20);
    const back = areaToSv(x, y, 200, 100);
    expect(back.s).toBeCloseTo(0.25);
    expect(back.v).toBeCloseTo(0.8);
  });
});
