import { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

// Vocabulario de movimiento de toda la app: curvas y duraciones en un solo sitio, para que cambiar el tacto sea un
// cambio, no una busqueda. Los valores son los de la skill animate-expo de Emil Kowalski.
//
// Cada curva existe en las dos formas que hace falta: como `Easing` (withTiming, animaciones de layout) y como
// cadena `cubic-bezier(...)` (transiciones y animaciones CSS de Reanimated).

// Entradas, salidas y respuesta a un toque: arranca rapida y asienta despacio. Nunca ease-in en la interfaz.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';

// Algo que se mueve o se transforma DENTRO de la pantalla (no entra ni sale de ella).
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_IN_OUT_CSS = 'cubic-bezier(0.77, 0, 0.175, 1)';

// Duraciones en ms. Una animacion de interfaz no pasa de 300 ms.
export const Duration = {
  // Feedback al pulsar: 100-150 ms.
  press: 120,
  // Fundido de contenido que aparece o desaparece.
  content: 200,
  // Las filas restantes se cierran sobre el hueco de una borrada.
  reflow: 200,
  // La pastilla del selector de tipo y las barras de progreso: algo que se mueve dentro de la pantalla.
  slide: 220,
  // Los arcos del grafico de donut al aparecer o cambiar.
  chart: 300,
  // Un latido completo (subida o bajada) del skeleton de carga.
  pulse: 700,
} as const;

// Constructores de animaciones de layout. Se crean una vez, fuera de los componentes: reutilizarlos evita
// reconstruirlos en cada render.
export const CONTENT_FADE_IN = FadeIn.duration(Duration.content);
export const ROW_EXIT = FadeOut.duration(Duration.content);
export const ROW_REFLOW = LinearTransition.duration(Duration.reflow);
