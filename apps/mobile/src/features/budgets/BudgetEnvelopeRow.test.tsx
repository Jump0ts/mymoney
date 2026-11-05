import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BudgetEntry } from './budgets.types';
import { BudgetEnvelopeRow } from './BudgetEnvelopeRow';

const envelope = (spent: string[], amount = '300.00'): BudgetEntry => ({
  id: 'super',
  groupId: 'g1',
  itemId: 'i1',
  name: 'Supermercado',
  amount,
  envelope: true,
  paid: false,
  position: 0,
  transactions: spent.map((value, index) => ({
    id: `t${index}`,
    amount: value,
    occurredAt: '2026-11-02T10:00:00.000Z',
  })),
});

// formatMoney separa el importe del euro con un espacio duro.
const labelOf = () => String(screen.getByTestId('budget-entry-super').props.accessibilityLabel).replace(/ /g, ' ');

const barWidth = () => {
  const bar = screen.getByTestId('budget-envelope-bar-super');
  const fill = bar.children[0] as unknown as { props: { style: unknown } };
  return Object.assign({}, ...[fill.props.style].flat(Infinity).filter(Boolean)).width;
};

describe('BudgetEnvelopeRow', () => {
  it('muestra el nombre, lo gastado de lo previsto y cuanto queda', () => {
    render(<BudgetEnvelopeRow entry={envelope(['45.00', '32.50', '60.00'])} onPress={jest.fn()} />);

    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('137,50 €')).toBeTruthy();
    expect(screen.getByText('de 300,00 €')).toBeTruthy();
    expect(screen.getByText('Quedan 162,50 €')).toBeTruthy();
  });

  it('sin gastos: 0 gastado, todo por gastar y barra vacia', () => {
    render(<BudgetEnvelopeRow entry={envelope([])} onPress={jest.fn()} />);

    expect(screen.getByText('0,00 €')).toBeTruthy();
    expect(screen.getByText('de 300,00 €')).toBeTruthy();
    expect(screen.getByText('Quedan 300,00 €')).toBeTruthy();
    expect(barWidth()).toBe('0%');
  });

  it('la barra se llena en proporcion a lo gastado', () => {
    render(<BudgetEnvelopeRow entry={envelope(['75.00'])} onPress={jest.fn()} />);

    expect(barWidth()).toBe('25%');
  });

  it('al pasarse avisa de cuanto, con la barra llena y no mas', () => {
    render(<BudgetEnvelopeRow entry={envelope(['40.00', '35.00', '42.00', '10.00'], '120.00')} onPress={jest.fn()} />);

    expect(screen.getByText('Te pasas 7,00 €')).toBeTruthy();
    expect(screen.queryByText(/Quedan/)).toBeNull();
    expect(barWidth()).toBe('100%');
  });

  it('gastar justo lo previsto deja 0 por gastar, no "te pasas"', () => {
    render(<BudgetEnvelopeRow entry={envelope(['60.00', '40.00'], '100.00')} onPress={jest.fn()} />);

    expect(screen.getByText('Quedan 0,00 €')).toBeTruthy();
    expect(screen.queryByText(/Te pasas/)).toBeNull();
  });

  it('es un boton accesible que resume el estado y dice como apuntar un gasto', () => {
    render(<BudgetEnvelopeRow entry={envelope(['137.50'])} onPress={jest.fn()} />);

    const row = screen.getByTestId('budget-entry-super');
    expect(row.props.accessibilityRole).toBe('button');
    expect(labelOf()).toBe('Supermercado, gastado 137,50 € de 300,00 €. Quedan 162,50 €');
    expect(row.props.accessibilityHint).toBe('Para apuntar un gasto en esta línea');
  });

  it('al pasarse el resumen accesible dice cuanto', () => {
    render(<BudgetEnvelopeRow entry={envelope(['127.00'], '120.00')} onPress={jest.fn()} />);

    expect(labelOf()).toBe('Supermercado, gastado 127,00 € de 120,00 €. Te pasas 7,00 €');
  });

  it('tocarlo llama a onPress con la linea', () => {
    const onPress = jest.fn();
    const entry = envelope(['10.00']);
    render(<BudgetEnvelopeRow entry={entry} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('budget-entry-super'));

    expect(onPress).toHaveBeenCalledWith(entry);
  });
});
