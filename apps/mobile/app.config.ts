import type { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'pre';

const envSuffix: Record<string, string> = {
  pre: ' (Pre)',
  staging: ' (Staging)',
  production: '',
};

const bundleSuffix: Record<string, string> = {
  pre: '.pre',
  staging: '.staging',
  production: '',
};

const config: ExpoConfig = {
  name: `MyMoney${envSuffix[APP_ENV] ?? ''}`,
  slug: 'mymoney',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: `mymoney${APP_ENV === 'production' ? '' : `-${APP_ENV}`}`,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: `com.mymoney.app${bundleSuffix[APP_ENV] ?? ''}`,
  },
  android: {
    package: `com.mymoney.app${bundleSuffix[APP_ENV] ?? ''}`,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#4F5DFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: APP_ENV,
  },
};

export default config;
