import { getReadableTextColor } from './color';

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
