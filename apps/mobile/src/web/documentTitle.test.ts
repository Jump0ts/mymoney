import { DEFAULT_APP_NAME, pageTitle } from './documentTitle';

describe('pageTitle', () => {
  it.each([
    ['/', 'Resumen · MyMoney'],
    ['/transactions', 'Movimientos · MyMoney'],
    ['/budgets', 'Presupuesto · MyMoney'],
    ['/categories', 'Categorías · MyMoney'],
    ['/settings', 'Ajustes · MyMoney'],
    ['/login', 'Iniciar sesión · MyMoney'],
    ['/register', 'Crear cuenta · MyMoney'],
    ['/add-transaction', 'Nuevo movimiento · MyMoney'],
    ['/pay-entry', 'Marcar como pagada · MyMoney'],
  ])('%s -> %s', (pathname, expected) => {
    expect(pageTitle(pathname)).toBe(expected);
  });

  it('la hoja de pago de un sobre se llama "Añadir gasto"; los parametros no cambian otras pantallas', () => {
    expect(pageTitle('/pay-entry', 'MyMoney', { envelope: '1', spent: '77.5' })).toBe('Añadir gasto · MyMoney');
    expect(pageTitle('/pay-entry', 'MyMoney', { entryId: 'e1' })).toBe('Marcar como pagada · MyMoney');
    expect(pageTitle('/budgets', 'MyMoney', { envelope: '1' })).toBe('Presupuesto · MyMoney');
  });

  it('reconoce la edicion de un movimiento por su prefijo, sea cual sea el id', () => {
    expect(pageTitle('/edit-transaction/cmw2ia8uy0000')).toBe('Editar movimiento · MyMoney');
  });

  it('no confunde una ruta que solo empieza igual', () => {
    expect(pageTitle('/edit-transactions-old')).toBe('MyMoney');
    expect(pageTitle('/budgets/otra')).toBe('MyMoney');
  });

  it('ignora la barra final', () => {
    expect(pageTitle('/budgets/')).toBe('Presupuesto · MyMoney');
  });

  it('una ruta desconocida deja solo el nombre de la app', () => {
    expect(pageTitle('/no-existe')).toBe('MyMoney');
  });

  it('usa el nombre de la app que le pasen (pre: "MyMoney (Pre)")', () => {
    expect(pageTitle('/budgets', 'MyMoney (Pre)')).toBe('Presupuesto · MyMoney (Pre)');
    expect(pageTitle('/no-existe', 'MyMoney (Pre)')).toBe('MyMoney (Pre)');
  });

  it('el nombre por defecto es el de la app', () => {
    expect(DEFAULT_APP_NAME).toBe('MyMoney');
  });
});
