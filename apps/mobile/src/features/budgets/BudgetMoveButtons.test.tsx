import { fireEvent, render, screen } from '@testing-library/react-native';
import { BudgetMoveButtons } from './BudgetMoveButtons';

const renderButtons = (props: Partial<React.ComponentProps<typeof BudgetMoveButtons>> = {}) => {
  const onMove = jest.fn();
  render(
    <BudgetMoveButtons
      label="Netflix"
      testIDPrefix="move"
      canMoveUp
      canMoveDown
      onMove={onMove}
      color="#000000"
      {...props}
    />,
  );
  return { onMove };
};

describe('BudgetMoveButtons', () => {
  it('sube y baja con su nombre accesible', () => {
    const { onMove } = renderButtons();

    fireEvent.press(screen.getByLabelText('Subir Netflix'));
    fireEvent.press(screen.getByLabelText('Bajar Netflix'));

    expect(onMove).toHaveBeenNthCalledWith(1, -1);
    expect(onMove).toHaveBeenNthCalledWith(2, 1);
  });

  it('la primera posicion no puede subir', () => {
    const { onMove } = renderButtons({ canMoveUp: false });
    const up = screen.getByTestId('move-up');

    expect(up.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(up);

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByTestId('move-down').props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('la ultima posicion no puede bajar', () => {
    const { onMove } = renderButtons({ canMoveDown: false });

    expect(screen.getByTestId('move-down').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('move-down'));

    expect(onMove).not.toHaveBeenCalled();
  });
});
