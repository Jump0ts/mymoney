import { ThemedText } from './themed-text';

// accessibilityRole="alert" + liveRegion hacen que el lector de pantalla anuncie
// el error al aparecer, en vez de dejarlo como un texto rojo mas que hay que encontrar.
export const FieldError = ({ message }: { message?: string | null }) => {
  if (!message) return null;

  return (
    <ThemedText themeColor="danger" type="small" accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </ThemedText>
  );
};
