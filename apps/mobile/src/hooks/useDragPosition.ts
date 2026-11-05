import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';

// Arrastrar un dedo (o el raton) por una zona: avisa de la posicion (x, y) dentro de ella y de su tamano, tanto al
// tocar como al mover. Lo usan los controles del selector de color (area de saturacion/brillo y tira de matiz).
// La zona tiene que recibir ella los toques: los hijos llevan pointerEvents="none", si no `locationX` seria el del hijo.
// Se esparcen `responderProps` y `onLayout` sobre el View de la zona.
export const useDragPosition = (onMove: (x: number, y: number, width: number, height: number) => void) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const moveRef = useRef(onMove);

  useEffect(() => {
    moveRef.current = onMove;
  }, [onMove]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = { width, height };
    setSize({ width, height });
  }, []);

  const responderProps = useMemo(() => {
    const report = (event: GestureResponderEvent) =>
      moveRef.current(event.nativeEvent.locationX, event.nativeEvent.locationY, sizeRef.current.width, sizeRef.current.height);

    return {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      // Una vez agarrado, ni un ScrollView padre ni otro gesto se lo quitan a mitad de arrastre.
      onResponderTerminationRequest: () => false,
      onResponderGrant: report,
      onResponderMove: report,
    };
  }, []);

  return { size, onLayout, responderProps };
};
