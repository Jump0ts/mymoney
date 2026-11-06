// Ajustes de la web para que se comporte como una app instalada en el movil. Viven aqui (y no dentro de +html.tsx)
// para poder comprobarlos con un test: +html.tsx solo se ejecuta en Node durante el renderizado estatico y no admite
// tests. Este modulo no puede importar 'react-native' ni theme.ts por la misma razon.
import { PWA_THEME_COLOR } from './PwaHead';

// viewport-fit=cover deja pintar bajo la muesca y la barra de inicio (los contenidos se apartan con safe-area-inset);
// interactive-widget=resizes-content hace que el teclado de Chrome en Android encoja el area visible, como en iOS,
// en vez de taparla. Nunca se desactiva el zoom (user-scalable=no): los inputs ya miden 16 px, que es lo que lo evita.
export const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content';

// Los controles de la app: botones, opciones de un grupo, casillas y pestanas.
const CONTROLS = '[role="button"], [role="radio"], [role="checkbox"], [role="tab"], button';

// Fondo de la pagina igual al de la app (sin destello blanco ni franjas en los bordes), sin rebote de arrastre que
// recargue la pagina, sin resaltado gris al tocar, sin retardo de doble toque y sin que una pulsacion larga seleccione
// la etiqueta de un control (el contenido, como un importe o una descripcion, si se puede seleccionar).
export const appShellCss = `
  html, body { background-color: ${PWA_THEME_COLOR.light}; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
  ${CONTROLS}, a { touch-action: manipulation; }
  ${CONTROLS} { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  @media (prefers-color-scheme: dark) {
    html, body { background-color: ${PWA_THEME_COLOR.dark}; }
  }
`;
