import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
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

  describe('anuncio para lectores de pantalla', () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
      jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear();
    });
    afterEach(() => jest.restoreAllMocks());

    it('al subir anuncia la nueva posicion', () => {
      renderButtons({ position: 2, total: 5 });

      fireEvent.press(screen.getByLabelText('Subir Netflix'));

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Netflix movido a la posición 2 de 5');
    });

    it('al bajar anuncia la nueva posicion', () => {
      renderButtons({ position: 0, total: 3 });

      fireEvent.press(screen.getByLabelText('Bajar Netflix'));

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Netflix movido a la posición 2 de 3');
    });

    it('sin posicion no anuncia nada', () => {
      renderButtons();

      fireEvent.press(screen.getByLabelText('Subir Netflix'));

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });
});
