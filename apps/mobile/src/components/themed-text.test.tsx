import { render, screen } from '@testing-library/react-native';
import { Colors } from '@/constants/theme';
import { DISPLAY_MAX_FONT_SCALE, ThemedText } from './themed-text';

const flatColor = (node: ReturnType<typeof screen.getByText>) =>
  Object.assign({}, ...[node.props.style].flat().filter(Boolean)).color;

describe('ThemedText', () => {
  it('acota el escalado de los textos grandes (title y subtitle)', () => {
    render(
      <>
        <ThemedText type="title">Titulo</ThemedText>
        <ThemedText type="subtitle">Subtitulo</ThemedText>
      </>,
    );

    expect(screen.getByText('Titulo').props.maxFontSizeMultiplier).toBe(DISPLAY_MAX_FONT_SCALE);
    expect(screen.getByText('Subtitulo').props.maxFontSizeMultiplier).toBe(DISPLAY_MAX_FONT_SCALE);
  });

  it('deja que el texto de cuerpo escale sin limite', () => {
    render(<ThemedText>Cuerpo</ThemedText>);

    expect(screen.getByText('Cuerpo').props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('permite sobrescribir el limite de escalado desde fuera', () => {
    render(
      <ThemedText type="title" maxFontSizeMultiplier={1}>
        Fijo
      </ThemedText>,
    );

    expect(screen.getByText('Fijo').props.maxFontSizeMultiplier).toBe(1);
  });

  it('usa el color primario del tema en linkPrimary aunque no se pase themeColor', () => {
    render(<ThemedText type="linkPrimary">Enlace</ThemedText>);

    const color = flatColor(screen.getByText('Enlace'));
    expect([Colors.light.primary, Colors.dark.primary]).toContain(color);
  });
});
