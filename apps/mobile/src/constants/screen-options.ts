import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

// `options` de una pantalla puede ser un objeto o una funcion; aqui siempre es el objeto.
type ScreenOptions = Exclude<NonNullable<ComponentProps<typeof Stack.Screen>['options']>, (...args: never[]) => unknown>;

// La hoja de pago es una accion corta (un importe, una categoria, un boton): en iOS se presenta como una hoja nativa
// (`formSheet`) que sube hasta el 70% de la pantalla y se puede subir del todo o bajar para descartarla, en vez de un
// modal a pantalla completa. En Android `formSheet` cae a un modal normal; en la web no hay hojas nativas. Los
// formularios largos (nuevo movimiento, editar) siguen siendo modales.
//
// Las alturas son fracciones de la pantalla, en orden ascendente; Android solo admite tres. Cuidado al cambiarlas: el
// formulario tiene que caber en la primera (hay que probarlo en un iPhone con la letra grande).
export const PAY_ENTRY_SHEET_DETENTS = [0.7, 1];

export const PAY_ENTRY_SCREEN_OPTIONS: ScreenOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: PAY_ENTRY_SHEET_DETENTS,
  sheetGrabberVisible: true,
  headerShown: true,
  title: 'Marcar como pagada',
};
