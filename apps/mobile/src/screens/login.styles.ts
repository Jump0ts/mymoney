import { StyleSheet } from 'react-native';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  form: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  title: { fontSize: 34, lineHeight: 40 },
  subtitle: { marginBottom: Spacing.two },
  // paddingVertical sube la zona pulsable del enlace (30px de linea) a >=44px.
  link: { alignSelf: 'center', marginTop: Spacing.two, paddingVertical: Spacing.two },
});
