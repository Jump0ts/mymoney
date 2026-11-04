import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { DEFAULT_APP_NAME, pageTitle } from './documentTitle';

// Pone el <title> de la web segun la pantalla abierta. El nombre sale de app.config.ts, asi que en pre sale
// "MyMoney (Pre)" y en produccion "MyMoney". En el movil no hay pestana de navegador: no pinta nada.
//  - <Head> escribe el titulo en el HTML estatico que se genera al exportar (lo que se ve antes de que cargue
//    el JavaScript y lo que lee el navegador al instalar el PWA).
//  - El efecto lo mantiene al navegar entre pantallas: Head solo lo fija al cargar, y entre pestanas el
//    titulo se quedaba en el de la primera.
const PageTitle = () => {
  const pathname = usePathname();
  const title = pageTitle(pathname, Constants.expoConfig?.name ?? DEFAULT_APP_NAME);

  useEffect(() => {
    if (Platform.OS === 'web') document.title = title;
  }, [title]);

  if (Platform.OS !== 'web') return null;

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
};

export default PageTitle;
