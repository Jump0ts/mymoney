import { useState } from 'react';
import { View } from 'react-native';
import { ValidationError } from 'yup';

import { Button } from '@/components/Button';
import { ColorArea } from '@/components/ColorArea';
import { FieldError } from '@/components/FieldError';
import { HueSlider } from '@/components/HueSlider';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { hexToHsv, hsvToHex, normalizeHex, type Hsv } from '@/utils/color';
import { customColorSchema } from './colors.schema';
import { styles } from './ColorPanel.styles';

interface ColorPanelProps {
  // Color con el que se abre (el que estaba elegido).
  initialColor: string;
  onApply: (hex: string) => void;
  onCancel: () => void;
  // Texto bajo el campo segun el color que se esta eligiendo, p. ej. "Se guardará en tus colores".
  noteFor?: (hex: string) => string | null;
}

// Selector de un color cualquiera: cuadrado de saturacion/brillo, tira de matiz y campo para escribir el codigo.
// Es un borrador: no cambia nada hasta pulsar "Usar este color".
export const ColorPanel = ({ initialColor, onApply, onCancel, noteFor }: ColorPanelProps) => {
  const theme = useTheme();
  const start = normalizeHex(initialColor) ?? '#6C5CE7';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(start));
  const [hexText, setHexText] = useState(start);
  const [error, setError] = useState<string | null>(null);

  const draft = normalizeHex(hexText) ?? hsvToHex(hsv);

  // Mover el selector actualiza el codigo; escribir un codigo valido mueve el selector.
  const pick = (next: Hsv) => {
    setHsv(next);
    setHexText(hsvToHex(next));
    setError(null);
  };

  const type = (text: string) => {
    setHexText(text);
    setError(null);
    const normalized = normalizeHex(text);
    if (normalized) setHsv(hexToHsv(normalized));
  };

  const apply = () => {
    try {
      customColorSchema.validateSync({ hex: hexText });
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Escribe un color como #1A2B3C');
      return;
    }
    onApply(normalizeHex(hexText) as string);
  };

  const note = noteFor?.(draft) ?? null;

  return (
    <View testID="color-panel" style={styles.panel}>
      <ColorArea hue={hsv.h} saturation={hsv.s} value={hsv.v} onChange={({ s, v }) => pick({ ...hsv, s, v })} />
      <HueSlider hue={hsv.h} onChange={(h) => pick({ ...hsv, h })} />

      <View style={styles.codeRow}>
        <View
          testID="color-panel-preview"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.preview, { backgroundColor: draft, borderColor: theme.border }]}
        />
        <Input
          testID="color-panel-hex"
          accessibilityLabel="Código del color"
          placeholder="#1A2B3C"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          value={hexText}
          onChangeText={type}
          style={styles.hexInput}
        />
      </View>
      <FieldError message={error} />
      {note && (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button testID="color-panel-cancel" label="Cancelar" variant="secondary" onPress={onCancel} />
        </View>
        <View style={styles.action}>
          <Button testID="color-panel-apply" label="Usar color" onPress={apply} />
        </View>
      </View>
    </View>
  );
};
