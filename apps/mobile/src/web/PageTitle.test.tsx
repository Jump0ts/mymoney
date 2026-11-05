import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import PageTitle from './PageTitle';

let mockPathname = '/budgets';
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useGlobalSearchParams: () => mockParams,
}));

// El Head real necesita el contexto de navegacion y de Helmet: aqui solo importa lo que se le pasa dentro.
jest.mock('expo-router/head', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <Text testID="head">{children}</Text> };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { name: 'MyMoney (Pre)' } },
}));

// El entorno de Jest de React Native no tiene DOM: se simula lo unico que usa el componente.
const fakeDocument = { title: '' };
(globalThis as unknown as { document: typeof fakeDocument }).document = fakeDocument;

const originalOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};

beforeEach(() => {
  fakeDocument.title = '';
});

afterEach(() => {
  setOS(originalOS);
  mockPathname = '/budgets';
  mockParams = {};
});

describe('PageTitle', () => {
  it('en la web pone el titulo de la pantalla con el nombre de la app del entorno', () => {
    setOS('web');
    const screen = render(<PageTitle />);

    expect(screen.getByTestId('head').props.children.props.children).toBe('Presupuesto · MyMoney (Pre)');
  });

  it('fija document.title para que la pestana lo muestre', () => {
    setOS('web');
    render(<PageTitle />);

    expect(fakeDocument.title).toBe('Presupuesto · MyMoney (Pre)');
  });

  it('sigue a la ruta abierta', () => {
    setOS('web');
    mockPathname = '/transactions';
    const screen = render(<PageTitle />);

    expect(screen.getByTestId('head').props.children.props.children).toBe('Movimientos · MyMoney (Pre)');
    expect(fakeDocument.title).toBe('Movimientos · MyMoney (Pre)');
  });

  it('al navegar a otra pantalla actualiza document.title (Head solo lo fija al cargar)', () => {
    setOS('web');
    const screen = render(<PageTitle />);
    expect(fakeDocument.title).toBe('Presupuesto · MyMoney (Pre)');

    mockPathname = '/settings';
    screen.rerender(<PageTitle />);

    expect(fakeDocument.title).toBe('Ajustes · MyMoney (Pre)');
  });

  it('la hoja de un sobre se llama "Añadir gasto", y la de una linea normal "Marcar como pagada"', () => {
    setOS('web');
    mockPathname = '/pay-entry';
    mockParams = { entryId: 'e1', envelope: '1' };
    const screen = render(<PageTitle />);
    expect(fakeDocument.title).toBe('Añadir gasto · MyMoney (Pre)');

    mockParams = { entryId: 'e1' };
    screen.rerender(<PageTitle />);
    expect(fakeDocument.title).toBe('Marcar como pagada · MyMoney (Pre)');
  });

  it('en el movil no pinta nada', () => {
    setOS('ios');
    const screen = render(<PageTitle />);

    expect(screen.queryByTestId('head')).toBeNull();
    expect(fakeDocument.title).toBe('');
  });
});
