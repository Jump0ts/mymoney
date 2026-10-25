// Etiquetas <head> para instalar la web como app (PWA). Se usa desde +html.tsx, que solo se ejecuta
// en Node durante el renderizado estatico: este modulo no puede importar 'react-native' ni theme.ts.
// Los colores deben mantenerse en sincronia manual con Colors.*.background en constants/theme.ts
// (lo comprueba src/web/pwa.test.ts).
export const PWA_THEME_COLOR = { light: '#F7F7FA', dark: '#0D0E12' } as const;

const PwaHead = () => (
  <>
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="application-name" content="MyMoney" />
    <meta name="apple-mobile-web-app-title" content="MyMoney" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="theme-color" content={PWA_THEME_COLOR.light} media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content={PWA_THEME_COLOR.dark} media="(prefers-color-scheme: dark)" />
    <meta name="format-detection" content="telephone=no" />
  </>
);

export default PwaHead;
