import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BudgetNewGroup } from './BudgetNewGroup';

const mockCreateGroup = jest.fn().mockResolvedValue(undefined);

jest.mock('./useBudgets', () => ({ useCreateGroup: () => ({ mutateAsync: mockCreateGroup }) }));

describe('BudgetNewGroup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('empieza como un boton y abre el formulario al pulsarlo', () => {
    render(<BudgetNewGroup />);
    expect(screen.queryByTestId('budget-group-name')).toBeNull();

    fireEvent.press(screen.getByTestId('budget-new-group'));

    expect(screen.getByTestId('budget-group-name')).toBeTruthy();
    expect(screen.queryByTestId('budget-new-group')).toBeNull();
  });

  it('crea el grupo y vuelve a ser un boton', async () => {
    render(<BudgetNewGroup />);

    fireEvent.press(screen.getByTestId('budget-new-group'));
    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Deseos');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(mockCreateGroup).toHaveBeenCalledWith({ name: 'Deseos', color: expect.any(String) }));
    expect(await screen.findByTestId('budget-new-group')).toBeTruthy();
  });

  it('cancelar cierra el formulario sin crear nada', () => {
    render(<BudgetNewGroup />);

    fireEvent.press(screen.getByTestId('budget-new-group'));
    fireEvent.press(screen.getByTestId('budget-group-cancel'));

    expect(screen.getByTestId('budget-new-group')).toBeTruthy();
    expect(mockCreateGroup).not.toHaveBeenCalled();
  });
});
