// Solo para tests: arrastra un dedo por un control hecho con Gesture.Pan() (el area y la tira del selector de color).
// `testID` es el que el control le dio al gesto con withTestId; cada punto es [x, y] dentro del control. El gesto
// empieza en el primer punto, sigue por los demas y termina al levantar el dedo.
//
// Es asincrono: el gesto avisa a React con `scheduleOnRN`, que llega en una microtarea, asi que hay que esperarla
// (`await drag(...)`) antes de comprobar nada.
import { act } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

export const drag = async (testID: string, points: [number, number][]) => {
  const [first, ...rest] = points;
  await act(async () => {
    fireGestureHandler(getByGestureTestId(testID), [
      { state: State.BEGAN, x: first[0], y: first[1] },
      { state: State.ACTIVE, x: first[0], y: first[1] },
      ...rest.map(([x, y]) => ({ state: State.ACTIVE, x, y })),
      { state: State.END },
    ]);
  });
};
