import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './Input.styles';

export const Input = ({ style, ...props }: TextInputProps) => {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
      {...props}
    />
  );
};
