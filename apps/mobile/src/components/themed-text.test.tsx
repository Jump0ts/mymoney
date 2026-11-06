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

  it('el texto grande lleva tracking negativo y el pequeno no: letras muy separadas se leen sueltas', () => {
    render(
      <>
        <ThemedText type="title">Titulo</ThemedText>
        <ThemedText type="subtitle">Subtitulo</ThemedText>
        <ThemedText>Cuerpo</ThemedText>
        <ThemedText type="small">Pequeno</ThemedText>
      </>,
    );
    const flat = (text: string) => Object.assign({}, ...[screen.getByText(text).props.style].flat(Infinity).filter(Boolean));

    expect(flat('Titulo').letterSpacing).toBeCloseTo(-0.02 * 48);
    expect(flat('Subtitulo').letterSpacing).toBeCloseTo(-0.02 * 32);
    expect(flat('Cuerpo').letterSpacing).toBeUndefined();
    expect(flat('Pequeno').letterSpacing).toBeUndefined();
  });

  it('el subtitulo lleva un interlineado justo (poco mas que su cuerpo)', () => {
    render(<ThemedText type="subtitle">Subtitulo</ThemedText>);
    const style = Object.assign({}, ...[screen.getByText('Subtitulo').props.style].flat(Infinity).filter(Boolean));

    expect(style.lineHeight / style.fontSize).toBeLessThan(1.25);
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
