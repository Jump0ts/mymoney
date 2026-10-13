import { fireEvent, render, screen } from '@testing-library/react-native';
import { TransactionRow } from './TransactionRow';
import type { Transaction } from './transactions.types';

const expenseTransaction: Transaction = {
  id: 'tx-1',
  type: 'EXPENSE',
  amount: '42.50',
  currency: 'EUR',
  description: 'Supermercado',
  occurredAt: '2026-05-10T10:00:00.000Z',
  category: { id: 'cat-1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
};

const incomeTransaction: Transaction = {
  ...expenseTransaction,
  id: 'tx-2',
  type: 'INCOME',
  description: null,
  category: { id: 'cat-2', name: 'Nómina', icon: 'briefcase', color: '#1FA971', type: 'INCOME' },
};

describe('TransactionRow', () => {
  it('muestra la descripcion, la categoria y el importe con signo negativo si es un gasto', () => {
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('Alimentación')).toBeTruthy();
    expect(screen.getByText(/^-.*42,50/)).toBeTruthy();
  });

  it('usa el nombre de la categoria cuando no hay descripcion, y muestra el importe en positivo si es un ingreso', () => {
    render(<TransactionRow transaction={incomeTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getAllByText('Nómina').length).toBeGreaterThan(0);
    expect(screen.getByText(/^\+.*42,50/)).toBeTruthy();
  });

  it('llama a onEdit con el movimiento al pulsar el icono de editar', () => {
    const onEdit = jest.fn();
    render(<TransactionRow transaction={expenseTransaction} onEdit={onEdit} onDelete={jest.fn()} />);

    fireEvent.press(screen.getByTestId('transaction-row-edit'));

    expect(onEdit).toHaveBeenCalledWith(expenseTransaction);
  });

  it('llama a onDelete con el movimiento al pulsar el icono de borrar', () => {
    const onDelete = jest.fn();
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={onDelete} />);

    fireEvent.press(screen.getByTestId('transaction-row-delete'));

    expect(onDelete).toHaveBeenCalledWith(expenseTransaction);
  });

  it('se desvanece cuando isDeleting es true', () => {
    render(
      <TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} isDeleting />,
    );

    const wrapper = screen.getByTestId('transaction-row-fade');
    const flatStyle = Object.assign({}, ...[wrapper.props.style].flat().filter(Boolean));
    expect(flatStyle.opacity).toBe(0);
  });

  it('tiene accessibilityLabel descriptivo en editar y borrar', () => {
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByLabelText('Editar Supermercado')).toBeTruthy();
    expect(screen.getByLabelText('Borrar Supermercado')).toBeTruthy();
  });

  it('no se desvanece por defecto', () => {
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);

    const wrapper = screen.getByTestId('transaction-row-fade');
    const flatStyle = Object.assign({}, ...[wrapper.props.style].flat().filter(Boolean));
    expect(flatStyle.opacity).toBe(1);
  });
});
