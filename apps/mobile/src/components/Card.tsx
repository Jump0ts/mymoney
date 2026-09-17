import type { ViewProps } from 'react-native';
import { ThemedView } from './themed-view';
import { styles } from './Card.styles';

export const Card = ({ style, ...props }: ViewProps) => (
  <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />
);
