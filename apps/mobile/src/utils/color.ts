const channel = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

// Texto negro o blanco, el que mas contraste (WCAG) tenga sobre un fondo #RRGGBB.
export const getReadableTextColor = (backgroundHex: string): '#000000' | '#FFFFFF' => {
  const bg = luminance(backgroundHex);
  const contrastWithWhite = 1.05 / (bg + 0.05);
  const contrastWithBlack = (bg + 0.05) / 0.05;
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#FFFFFF';
};
