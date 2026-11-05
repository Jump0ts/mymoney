import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { ColorPicker } from '@/components/ColorPicker';
import { normalizeHex } from '@/utils/color';
import { ColorPalette, MAX_SAVED_COLORS } from './colors.constants';
import { ColorPanel } from './ColorPanel';
import { useRemoveColor, useSavedColors, useSaveColor } from './useColors';
import { styles } from './ColorField.styles';

interface ColorFieldProps {
  value: string;
  onChange: (color: string) => void;
  accessibilityLabel?: string;
}

const sameColor = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

// El campo de color de las categorias y de los grupos del presupuesto: la paleta de siempre, los colores propios
// guardados de la cuenta y un "+" para elegir cualquier otro, que se guarda para la proxima vez.
export const ColorField = ({ value, onChange, accessibilityLabel }: ColorFieldProps) => {
  const { data: saved = [] } = useSavedColors();
  const { mutate: saveColor } = useSaveColor();
  const { mutate: removeColor, isPending: removing } = useRemoveColor();
  const [panelOpen, setPanelOpen] = useState(false);

  const isPreset = (hex: string) => ColorPalette.some((color) => sameColor(color, hex));
  const isSaved = (hex: string) => saved.some((color) => sameColor(color.hex, hex));
  const full = saved.length >= MAX_SAVED_COLORS;

  // Un color ya conocido (de la paleta o ya guardado) no se vuelve a guardar; uno nuevo se guarda si queda sitio.
  const apply = (hex: string) => {
    onChange(hex);
    setPanelOpen(false);
    if (!isPreset(hex) && !isSaved(hex) && !full) saveColor(hex);
  };

  const noteFor = (hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized || isPreset(normalized) || isSaved(normalized)) return null;
    return full
      ? `Ya tienes ${MAX_SAVED_COLORS} colores guardados: este se usará pero no se guardará. Quita alguno para guardar más.`
      : 'Se guardará en tus colores para usarlo otra vez.';
  };

  // Solo se ofrece quitar el color propio que esta elegido: la paleta de siempre no se toca.
  const selectedSaved = saved.find((color) => sameColor(color.hex, value));

  return (
    <View style={styles.field}>
      <ColorPicker
        accessibilityLabel={accessibilityLabel}
        colors={ColorPalette}
        value={value}
        onChange={onChange}
        savedColors={saved.map((color) => color.hex)}
        onCustom={() => setPanelOpen((open) => !open)}
        customOpen={panelOpen}
      />

      {selectedSaved && !panelOpen && (
        <Button
          testID="color-remove-saved"
          label={`Quitar ${selectedSaved.hex} de mis colores`}
          variant="secondary"
          loading={removing}
          onPress={() => removeColor(selectedSaved.id)}
        />
      )}

      {panelOpen && <ColorPanel initialColor={value} onApply={apply} onCancel={() => setPanelOpen(false)} noteFor={noteFor} />}
    </View>
  );
};
