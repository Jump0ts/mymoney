import { StyleSheet, type ViewProps } from 'react-native';
import { ThemedView } from './themed-view';
import { Radius, Spacing } from '@/constants/theme';

export function Card({ style, ...props }: ViewProps) {
  return <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.four,
  },
});
