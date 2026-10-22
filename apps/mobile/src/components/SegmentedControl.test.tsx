import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

const options: SegmentOption<'A' | 'B' | undefined>[] = [
  { label: 'Todo', value: undefined },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
];

describe('SegmentedControl', () => {
  it('muestra todas las opciones', () => {
    render(<SegmentedControl options={options} value={undefined} onChange={jest.fn()} />);

    expect(screen.getByText('Todo')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('llama a onChange con el valor de la opcion pulsada', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} value={undefined} onChange={onChange} />);

    fireEvent.press(screen.getByText('B'));

    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('expone el rol y el estado seleccionado a lectores de pantalla', () => {
    render(<SegmentedControl options={options} value="A" onChange={jest.fn()} />);

    const active = screen.getByLabelText('A');
    expect(active.props.accessibilityRole).toBe('radio');
    expect(active.props.accessibilityState).toMatchObject({ selected: true });

    const inactive = screen.getByLabelText('B');
    expect(inactive.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('nombra el grupo de opciones cuando se le da una etiqueta', () => {
    render(<SegmentedControl options={options} value="A" onChange={jest.fn()} accessibilityLabel="Tipo" />);

    expect(screen.getByLabelText('Tipo').props.accessibilityRole).toBe('radiogroup');
  });

  it('no revienta al medir el layout de cada segmento y reposicionar la pastilla', () => {
    render(<SegmentedControl options={options} value="A" onChange={jest.fn()} />);

    const segment = screen.getByText('A').parent!;
    fireEvent(segment, 'layout', { nativeEvent: { layout: { x: 40, y: 0, width: 60, height: 32 } } });

    expect(screen.getByText('A')).toBeTruthy();
  });
});
