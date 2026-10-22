import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { confirmAsync } from '@/utils/alert';
import { BudgetGroupForm } from './BudgetGroupForm';
import { BudgetLineForm } from './BudgetLineForm';
import { EditGuardProvider, useEditGuard, useReportDirty } from './useEditGuard';

jest.mock('@/utils/alert', () => ({ confirmAsync: jest.fn().mockResolvedValue(true), notify: jest.fn() }));

// Una pantalla con dos formularios que pueden estar sucios.
const setup = (initial: { a: boolean; b: boolean } = { a: false, b: false }) => {
  const screen = renderHook(() => useEditGuard());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <EditGuardProvider value={screen.result.current.guard}>{children}</EditGuardProvider>
  );
  const formA = renderHook(({ dirty }) => useReportDirty(dirty), { wrapper, initialProps: { dirty: initial.a } });
  const formB = renderHook(({ dirty }) => useReportDirty(dirty), { wrapper, initialProps: { dirty: initial.b } });
  return { screen, formA, formB };
};

describe('useEditGuard', () => {
  beforeEach(() => jest.mocked(confirmAsync).mockReset().mockResolvedValue(true));

  it('sin cambios sin guardar deja seguir sin preguntar', async () => {
    const { screen } = setup();

    await expect(screen.result.current.confirmDiscard()).resolves.toBe(true);
    expect(confirmAsync).not.toHaveBeenCalled();
  });

  it('con un formulario sucio pide confirmacion y respeta la respuesta', async () => {
    const { screen } = setup({ a: true, b: false });

    await expect(screen.result.current.confirmDiscard()).resolves.toBe(true);
    expect(confirmAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Descartar cambios', destructive: true }),
    );

    jest.mocked(confirmAsync).mockResolvedValueOnce(false);
    await expect(screen.result.current.confirmDiscard()).resolves.toBe(false);
  });

  it('deja de preguntar cuando el formulario vuelve a estar limpio', async () => {
    const { screen, formA } = setup({ a: true, b: false });

    formA.rerender({ dirty: false });

    await expect(screen.result.current.confirmDiscard()).resolves.toBe(true);
    expect(confirmAsync).not.toHaveBeenCalled();
  });

  it('un formulario que se cierra (se desmonta) sucio deja de contar', async () => {
    const { screen, formA } = setup({ a: true, b: false });

    formA.unmount();

    await expect(screen.result.current.confirmDiscard()).resolves.toBe(true);
    expect(confirmAsync).not.toHaveBeenCalled();
  });

  it('sigue preguntando mientras quede algun formulario sucio', async () => {
    const { screen, formA } = setup({ a: true, b: true });

    await act(async () => formA.rerender({ dirty: false }));

    await screen.result.current.confirmDiscard();
    expect(confirmAsync).toHaveBeenCalledTimes(1);
  });

  it('un formulario fuera de la pantalla (sin guarda) no falla', () => {
    expect(() => renderHook(() => useReportDirty(true))).not.toThrow();
  });
});

describe('formularios reales con la guarda', () => {
  beforeEach(() => jest.mocked(confirmAsync).mockReset().mockResolvedValue(true));

  const renderWithGuard = (children: ReactNode) => {
    const screenGuard = renderHook(() => useEditGuard());
    render(<EditGuardProvider value={screenGuard.result.current.guard}>{children}</EditGuardProvider>);
    return screenGuard.result.current.confirmDiscard;
  };

  it('el formulario de linea avisa en cuanto se escribe algo', async () => {
    const confirmDiscard = renderWithGuard(
      <BudgetLineForm
        defaultValues={{ name: '', lineType: 'FIXED', amount: '', scope: 'month' }}
        scopeOptions={null}
        submitLabel="Guardar"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    await expect(confirmDiscard()).resolves.toBe(true);
    expect(confirmAsync).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('budget-line-name'), 'Netflix');
    await act(async () => {});

    await confirmDiscard();
    expect(confirmAsync).toHaveBeenCalledTimes(1);
  });

  it('el formulario de grupo avisa en cuanto se escribe algo', async () => {
    const confirmDiscard = renderWithGuard(
      <BudgetGroupForm submitLabel="Crear grupo" onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Hogar');
    await act(async () => {});

    await confirmDiscard();
    expect(confirmAsync).toHaveBeenCalledTimes(1);
  });
});
