import { Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './themed-text.styles';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

// Los textos de cuerpo escalan sin limite con el tamano de letra del sistema;
// los grandes (48px y 32px) se acotan porque a 2x desbordan su contenedor.
export const DISPLAY_MAX_FONT_SCALE = 1.3;

export const ThemedText = ({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) => {
  const theme = useTheme();
  const resolvedThemeColor = themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text');

  return (
    <Text
      maxFontSizeMultiplier={type === 'title' || type === 'subtitle' ? DISPLAY_MAX_FONT_SCALE : undefined}
      style={[
        { color: theme[resolvedThemeColor] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
};
