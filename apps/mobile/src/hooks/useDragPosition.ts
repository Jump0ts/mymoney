import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface DragSize {
  width: number;
  height: number;
}

interface DragPositionOptions {
  // Avisa de la posicion (x, y) dentro de la zona, ya recortada a sus bordes, y de su tamano.
  onMove: (x: number, y: number, width: number, height: number) => void;
  // Donde esta el tirador (en px dentro de la zona) segun el valor actual: cuando el valor cambia por otro camino (un
  // campo de texto, el lector de pantalla, otro control) el tirador se coloca ahi.
  restAt: (size: DragSize) => { x: number; y: number };
  // Identificador del gesto para los tests (`getByGestureTestId`).
  testID?: string;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

// Arrastrar un dedo (o el raton) por una zona: avisa de la posicion (x, y) dentro de ella y de su tamano, tanto al
// tocar como al mover. Lo usan los controles del selector de color (area de saturacion/brillo y tira de matiz).
//
// El tirador (`x`, `y`, en px) sigue al dedo en el hilo de UI, sin esperar a que React vuelva a pintar: es lo que
// lo hace fluido aunque la app este ocupada. El valor (color, campo hexadecimal) se avisa a React con `onMove` en
// cada cambio de posicion, para que la vista previa se vea en directo; el tirador nunca depende de ese viaje.
// Se esparce `onLayout` sobre el View de la zona y se envuelve en un GestureDetector con `gesture`.
export const useDragPosition = ({ onMove, restAt, testID }: DragPositionOptions) => {
  const [size, setSize] = useState<DragSize>({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const moveRef = useRef(onMove);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const dragging = useSharedValue(false);
  // Ultima posicion avisada: no se avisa dos veces de la misma.
  const lastX = useSharedValue(-1);
  const lastY = useSharedValue(-1);

  useEffect(() => {
    moveRef.current = onMove;
  }, [onMove]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width: w, height: h } = event.nativeEvent.layout;
      sizeRef.current = { width: w, height: h };
      width.set(w);
      height.set(h);
      setSize({ width: w, height: h });
    },
    [height, width],
  );

  const report = useCallback((px: number, py: number) => {
    moveRef.current(px, py, sizeRef.current.width, sizeRef.current.height);
  }, []);

  const gesture = useMemo(() => {
    const follow = (touchX: number, touchY: number) => {
      'worklet';
      // Una coordenada que no es un numero (un evento incompleto) se ignora: un NaN acabaria como un color negro.
      if (!Number.isFinite(touchX) || !Number.isFinite(touchY)) return;
      const nextX = clamp(touchX, 0, width.get());
      const nextY = clamp(touchY, 0, height.get());
      x.set(nextX);
      y.set(nextY);
      if (nextX === lastX.get() && nextY === lastY.get()) return;
      lastX.set(nextX);
      lastY.set(nextY);
      scheduleOnRN(report, nextX, nextY);
    };

    // minDistance(0): agarra al tocar, sin esperar a que el dedo se mueva, como el control de un selector de color.
    const pan = Gesture.Pan()
      .minDistance(0)
      .onBegin((event) => {
        dragging.set(true);
        follow(event.x, event.y);
      })
      .onUpdate((event) => follow(event.x, event.y))
      .onFinalize(() => {
        dragging.set(false);
      });
    return testID ? pan.withTestId(testID) : pan;
  }, [dragging, height, lastX, lastY, report, testID, width, x, y]);

  // El tirador se coloca donde dice el valor, salvo mientras el dedo lo lleva: ahi manda el dedo.
  const rest = restAt(size);
  useEffect(() => {
    if (dragging.get()) return;
    x.set(rest.x);
    y.set(rest.y);
    lastX.set(-1);
    lastY.set(-1);
  }, [dragging, lastX, lastY, rest.x, rest.y, x, y]);

  return { size, onLayout, gesture, x, y };
};
