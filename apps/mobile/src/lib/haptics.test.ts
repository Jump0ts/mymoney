import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { confirmHaptic } from './haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('confirmHaptic', () => {
  beforeEach(() => {
    jest.mocked(Haptics.notificationAsync).mockClear();
  });

  it('en el movil lanza la vibracion de exito, y solo esa', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    confirmHaptic();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('tambien en Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    confirmHaptic();

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('en la web no hace nada', () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    confirmHaptic();

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('si el dispositivo no puede vibrar no revienta ni deja una promesa sin atender', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('sin motor haptico'));

    expect(() => confirmHaptic()).not.toThrow();
    await Promise.resolve();
  });
});
