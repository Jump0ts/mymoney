import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import PwaHead from '@/web/PwaHead';

// +html.tsx solo se ejecuta en Node durante el renderizado estatico para web,
// por lo que no puede importar constants/theme.ts (arrastra 'react-native').
// Los colores de aqui deben mantenerse en sincronia manual con Colors.light.border
// y Colors.dark.border en apps/mobile/src/constants/theme.ts.
const scrollbarCss = `
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background-color: #E3E4EA;
    border-radius: 8px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: #C9CBD6; }
  * { scrollbar-width: thin; scrollbar-color: #E3E4EA transparent; }

  @media (prefers-color-scheme: dark) {
    ::-webkit-scrollbar-thumb { background-color: #2A2B34; }
    ::-webkit-scrollbar-thumb:hover { background-color: #3A3B47; }
    * { scrollbar-color: #2A2B34 transparent; }
  }
`;

// Ajustes para que la web se comporte como app instalada en el movil: fondo de la pagina igual al de la
// app (sin destello blanco ni franjas en los bordes), sin rebote de arrastre que recargue la pagina,
// sin resaltado gris al tocar y sin retardo de doble toque. Fondos = Colors.*.background (ver PwaHead).
const appShellCss = `
  html, body { background-color: #F7F7FA; overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
  [role="button"], button, a { touch-action: manipulation; }
  @media (prefers-color-scheme: dark) {
    html, body { background-color: #0D0E12; }
  }
`;

const Root = ({ children }: PropsWithChildren) => (
  <html lang="es">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <PwaHead />
      <ScrollViewStyleReset />
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <style dangerouslySetInnerHTML={{ __html: appShellCss }} />
    </head>
    <body>{children}</body>
  </html>
);

export default Root;
