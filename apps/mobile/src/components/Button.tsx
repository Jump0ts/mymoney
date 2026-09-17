import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './Button.styles';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export const Button = ({ label, variant = 'primary', loading, disabled, style, ...props }: ButtonProps) => {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundSelected;
  const textColor = variant === 'secondary' ? theme.text : theme.primaryText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        { backgroundColor, opacity: state.pressed || disabled ? 0.7 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={{ color: textColor }} type="smallBold">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
};
