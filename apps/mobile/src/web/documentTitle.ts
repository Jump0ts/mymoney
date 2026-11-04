// Titulo de la pestana del navegador (y de la ventana del PWA instalado) segun la pantalla abierta.
// Expo Router no lo pone solo (su documentTitle viene desactivado), asi que sin esto la pestana sale vacia.
export const DEFAULT_APP_NAME = 'MyMoney';

// Nombre de cada pantalla (el mismo que sus cabeceras y pestanas). Las rutas con parametro se reconocen por prefijo.
const SECTIONS: { path: string; prefix?: boolean; title: string }[] = [
  { path: '/', title: 'Resumen' },
  { path: '/transactions', title: 'Movimientos' },
  { path: '/budgets', title: 'Presupuesto' },
  { path: '/categories', title: 'Categorías' },
  { path: '/settings', title: 'Ajustes' },
  { path: '/login', title: 'Iniciar sesión' },
  { path: '/register', title: 'Crear cuenta' },
  { path: '/add-transaction', title: 'Nuevo movimiento' },
  { path: '/pay-entry', title: 'Marcar como pagada' },
  { path: '/edit-transaction', prefix: true, title: 'Editar movimiento' },
];

// "Presupuesto · MyMoney"; si la ruta no se conoce, solo el nombre de la app.
export const pageTitle = (pathname: string, appName: string = DEFAULT_APP_NAME): string => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const section = SECTIONS.find((item) => (item.prefix ? path === item.path || path.startsWith(`${item.path}/`) : path === item.path));
  return section ? `${section.title} · ${appName}` : appName;
};
