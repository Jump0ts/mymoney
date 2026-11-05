// Utilidades de color genericas (las usan categorias, grupos del presupuesto y graficos). Todos los colores
// de la app son #RRGGBB.

const channel = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string) => {
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

// ---- Formato ----

// Lo que el usuario escribe ("#1a2b3c", "1A2B3C", "#abc", " abc ") a #RRGGBB en mayusculas; null si no es un color.
export const normalizeHex = (text: string): string | null => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  return `#${digits.toUpperCase()}`;
};

type Rgb = [number, number, number]; // 0..255

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgbToHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

// ---- HSV (el selector de color: matiz, saturacion, brillo) ----

export interface Hsv {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export const hexToHsv = (hex: string): Hsv => {
  const [r, g, b] = hexToRgb(hex).map((value) => value / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
};

export const hsvToHex = ({ h, s, v }: Hsv): string => {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  const sector = Math.floor(hue / 60);
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector % 6];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};

// ---- HSL (ajustar la claridad sin cambiar el tono) ----

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const hexToHsl = (hex: string): Hsl => {
  const { h, s: sv, v } = hexToHsv(hex);
  const l = v * (1 - sv / 2);
  return { h, s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l };
};

const hslToHex = ({ h, s, l }: Hsl): string => {
  const v = l + s * Math.min(l, 1 - l);
  return hsvToHex({ h, s: v === 0 ? 0 : 2 * (1 - l / v), v });
};

// ---- Contraste ----

// Relacion de contraste WCAG entre dos colores (1 = iguales, 21 = blanco sobre negro).
export const contrastRatio = (a: string, b: string): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Contraste minimo con el fondo para que un color de categoria o de grupo no se pierda (un casi blanco en modo claro,
// un casi negro en modo oscuro). Es un suelo bajo a proposito: solo toca lo que se vuelve invisible.
export const MIN_VISIBLE_CONTRAST = 2;

// El mismo color si se distingue del fondo; si no, el mismo tono con la claridad movida hacia el lado contrario
// al fondo hasta llegar al contraste minimo. Solo cambia lo que se pinta: el color guardado no se toca.
export const legibleColor = (hex: string, backgroundHex: string, minContrast = MIN_VISIBLE_CONTRAST): string => {
  if (contrastRatio(hex, backgroundHex) >= minContrast) return hex;

  const hsl = hexToHsl(hex);
  const darker = luminance(backgroundHex) > 0.18; // fondo claro: oscurecer; fondo oscuro: aclarar
  for (let step = 1; step <= 50; step += 1) {
    const l = Math.max(0, Math.min(1, hsl.l + (darker ? -1 : 1) * step * 0.02));
    const candidate = hslToHex({ ...hsl, l });
    if (contrastRatio(candidate, backgroundHex) >= minContrast) return candidate;
  }
  return darker ? '#000000' : '#FFFFFF';
};

// ---- Area saturacion/brillo del selector ----

// Posicion (x, y) dentro de un area de ancho x alto a saturacion y brillo: la saturacion crece hacia la derecha y el
// brillo hacia arriba. Lo que cae fuera del area se recorta a su borde.
export const areaToSv = (x: number, y: number, width: number, height: number): { s: number; v: number } => ({
  s: width <= 0 ? 0 : Math.max(0, Math.min(1, x / width)),
  v: height <= 0 ? 0 : Math.max(0, Math.min(1, 1 - y / height)),
});

export const svToArea = (s: number, v: number, width: number, height: number): { x: number; y: number } => ({
  x: s * width,
  y: (1 - v) * height,
});
