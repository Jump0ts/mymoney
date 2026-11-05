import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TransactionRow } from './TransactionRow';
import { styles } from './TransactionRow.styles';
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

describe('TransactionRow - linea del presupuesto', () => {
  const linked: Transaction = {
    ...expenseTransaction,
    budgetEntry: { id: 'e1', name: 'Luz', group: { name: 'Hogar', color: '#6C5CE7' } },
  };

  it('muestra la linea y el grupo del presupuesto que cubre el gasto', () => {
    render(<TransactionRow transaction={linked} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Luz · Hogar')).toBeTruthy();
    expect(screen.getByTestId('transaction-row-budget').props.accessibilityLabel).toBe(
      'Cubre Luz del presupuesto, grupo Hogar',
    );
  });

  it('un ingreso enlazado a un reembolso lo dice con otras palabras: no "cubre" la linea, la devuelve', () => {
    const refund: Transaction = {
      ...incomeTransaction,
      budgetEntry: { id: 'r1', name: 'Internet (mitad)', group: { name: 'Hogar', color: '#6C5CE7' } },
    };
    render(<TransactionRow transaction={refund} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Internet (mitad) · Hogar')).toBeTruthy();
    expect(screen.getByTestId('transaction-row-budget').props.accessibilityLabel).toBe(
      'Reembolso de Internet (mitad) del presupuesto, grupo Hogar',
    );
  });

  it('sin enlace no muestra nada del presupuesto', () => {
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);
    render(
      <TransactionRow transaction={{ ...expenseTransaction, id: 'tx-3', budgetEntry: null }} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(screen.queryByTestId('transaction-row-budget')).toBeNull();
  });
});

describe('TransactionRow - pantallas estrechas', () => {
  it('la fecha va en una sola linea (antes se partia en "07 / oct / 2026")', () => {
    render(<TransactionRow transaction={expenseTransaction} onEdit={jest.fn()} onDelete={jest.fn()} />);

    const date = screen.getByText(/oct|may/i, { exact: false });
    expect(date.props.numberOfLines).toBe(1);
  });

  it('la categoria y la fecha pueden pasar a dos lineas en vez de comprimirse', () => {
    const meta = StyleSheet.flatten(styles.rowMeta);
    const info = StyleSheet.flatten(styles.rowInfo);

    expect(meta.flexWrap).toBe('wrap');
    expect(StyleSheet.flatten(styles.date).flexShrink).toBe(0);
    // minWidth 0 deja que la informacion encoja en vez de empujar el importe y los botones.
    expect(info.minWidth).toBe(0);
  });
});
