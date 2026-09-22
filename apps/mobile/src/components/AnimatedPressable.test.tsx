import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

const getScale = (node: ReturnType<typeof screen.getByTestId>) => {
  const flatStyle = Object.assign({}, ...[node.props.style].flat().filter(Boolean));
  return flatStyle.transform?.[0]?.scale;
};

describe('AnimatedPressable', () => {
  it('llama a onPress al pulsar', () => {
    const onPress = jest.fn();
    render(
      <AnimatedPressable onPress={onPress}>
        <Text>Hola</Text>
      </AnimatedPressable>,
    );

    fireEvent.press(screen.getByText('Hola'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('encoge al pulsar y vuelve a su tamaño al soltar', () => {
    render(
      <AnimatedPressable testID="pressable">
        <Text>Hola</Text>
      </AnimatedPressable>,
    );

    expect(getScale(screen.getByTestId('pressable'))).toBe(1);

    fireEvent(screen.getByTestId('pressable'), 'pressIn');
    expect(getScale(screen.getByTestId('pressable'))).toBe(0.97);

    fireEvent(screen.getByTestId('pressable'), 'pressOut');
    expect(getScale(screen.getByTestId('pressable'))).toBe(1);
  });

  it('no encoge si esta deshabilitado', () => {
    render(
      <AnimatedPressable testID="pressable" disabled>
        <Text>Hola</Text>
      </AnimatedPressable>,
    );

    fireEvent(screen.getByTestId('pressable'), 'pressIn');

    expect(getScale(screen.getByTestId('pressable'))).toBe(1);
  });
});
