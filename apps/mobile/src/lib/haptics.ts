import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Una vibracion de exito: la respuesta a algo que el usuario acaba de confirmar (un pago, un cobro, un gasto) y que el
// servidor ya ha aceptado. Es un refuerzo, nunca el unico aviso: muchos usuarios la tienen desactivada en el sistema y
// la mayoria de los Android no la notan, asi que lo que hay que ver sigue viendose en pantalla. En la web no hace nada.
export const confirmHaptic = () => {
  if (Platform.OS === 'web') return;
  // Si el dispositivo no puede vibrar, no pasa nada: se ignora el error.
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
