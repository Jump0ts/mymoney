import { ActivityIndicator, type PressableProps } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './Button.styles';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export const Button = ({ label, variant = 'primary', loading, disabled, ...props }: ButtonProps) => {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundSelected;
  const textColor = variant === 'secondary' ? theme.text : theme.primaryText;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[styles.base, { backgroundColor, opacity: disabled || loading ? 0.7 : 1 }]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={{ color: textColor }} type="smallBold">
          {label}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
};
