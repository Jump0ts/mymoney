import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  // 44px: tamano minimo comodo de una zona pulsable.
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
});
