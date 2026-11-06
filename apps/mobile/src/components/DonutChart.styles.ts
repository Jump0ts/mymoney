import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El rotulo del centro va sobre el grafico y no le quita los toques.
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    pointerEvents: 'none',
  },
});
