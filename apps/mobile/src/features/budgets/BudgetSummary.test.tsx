import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { BudgetMonthTotals } from './budgets.types';
import { BudgetSummary } from './BudgetSummary';

const totals: BudgetMonthTotals = {
  income: 1594.9,
  planned: 1333.83,
  paid: 558.62,
  remainingPlanned: 261.07,
  remainingReal: 1036.28,
};

const startEditing = () => fireEvent.press(screen.getByTestId('budget-income-edit'));

describe('BudgetSummary', () => {
  it('muestra el sueldo, el total a gastar y el resto', () => {
    render(<BudgetSummary totals={totals} onSaveIncome={jest.fn()} />);

    expect(screen.getByLabelText(/^Sueldo: 1594,90/)).toBeTruthy();
    expect(screen.getAllByLabelText(/^Previsto: /).map((n) => n.props.accessibilityLabel)).toEqual([
      expect.stringContaining('1333,83'),
      expect.stringContaining('261,07'),
    ]);
    expect(screen.getByLabelText(/^Pagado: 558,62/)).toBeTruthy();
    expect(screen.getByLabelText(/^Real: 1036,28/)).toBeTruthy();
  });

  it('guarda un sueldo nuevo, aceptando coma decimal', async () => {
    const onSaveIncome = jest.fn().mockResolvedValue(undefined);
    render(<BudgetSummary totals={totals} onSaveIncome={onSaveIncome} />);

    startEditing();
    fireEvent.changeText(screen.getByTestId('budget-income-input'), '1700,5');
    fireEvent.press(screen.getByTestId('budget-income-save'));

    await waitFor(() => expect(onSaveIncome).toHaveBeenCalledWith(1700.5));
    await waitFor(() => expect(screen.queryByTestId('budget-income-input')).toBeNull());
  });

  it('rechaza un importe vacio, no numerico o negativo sin llamar a guardar', async () => {
    const onSaveIncome = jest.fn();
    render(<BudgetSummary totals={totals} onSaveIncome={onSaveIncome} />);
    startEditing();

    for (const invalid of ['', 'abc', '-5']) {
      fireEvent.changeText(screen.getByTestId('budget-income-input'), invalid);
      fireEvent.press(screen.getByTestId('budget-income-save'));
      expect(await screen.findByText('Escribe un importe válido (0 o más)')).toBeTruthy();
    }
    expect(onSaveIncome).not.toHaveBeenCalled();
  });

  it('muestra un error y sigue editando si el servidor falla', async () => {
    const onSaveIncome = jest.fn().mockRejectedValue(new Error('boom'));
    render(<BudgetSummary totals={totals} onSaveIncome={onSaveIncome} />);

    startEditing();
    fireEvent.changeText(screen.getByTestId('budget-income-input'), '1700');
    fireEvent.press(screen.getByTestId('budget-income-save'));

    expect(await screen.findByText('No se pudo guardar el sueldo')).toBeTruthy();
    expect(screen.getByTestId('budget-income-input')).toBeTruthy();
  });
});
