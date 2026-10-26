# MyMoney — client app (Expo)

The iOS, Android and web client of MyMoney, built with [Expo](https://expo.dev), Expo Router and TypeScript. For what the project does,
the overall architecture and how to run everything, see the [root README](../../README.md).

## Scripts

Run them from the repository root (workspace `apps/mobile`):

| Command | What it does |
|---|---|
| `npm run mobile:dev` | Starts Expo (web, Expo Go, emulators). |
| `npm run test --workspace=apps/mobile` | Jest + React Native Testing Library, with coverage. |
| `npm run lint --workspace=apps/mobile` | ESLint. |
| `npm run typecheck --workspace=apps/mobile` | TypeScript, no emit. |
| `npm run build:web --workspace=apps/mobile` | Exports the web app to `dist/` and writes `dist/_headers` with a strict Content Security Policy (requires `EXPO_PUBLIC_API_URL` to be `https`). |

## Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL (default `http://localhost:4000`). Baked into the web build. |
| `EXPO_PUBLIC_APP_ENV` | `pre`, `staging` or `production`: changes the app name and bundle id so several builds can be installed side by side. |

## Install the web build as an app (PWA)

`public/` holds the web manifest and the home-screen icons (`manifest.json`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
`apple-touch-icon.png`); `src/web/PwaHead.tsx` adds the matching `<head>` tags. There is no service worker, so the app needs a connection.

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app*.

The icons are generated from `assets/images/web-icon.svg` (for example with `npx sharp-cli`); the native icon in `assets/images/icon.png` is separate.

## Code organisation

```
src/app/         Routes (Expo Router). No styles or tests here: every file in a routed folder becomes a screen.
src/features/    One folder per domain (transactions, categories, budgets, auth…): types, schemas, hooks and components.
src/components/  Generic, reusable components.
src/screens/     Screen styles (deliberately outside src/app).
src/utils/       Generic helpers.
scripts/         Build scripts (web security headers).
```

Conventions: forms use React Hook Form + Yup with one schema per domain; styles live in a `*.styles.ts` file next to the component;
anything needed by two domains is owned by one of them and imported, never duplicated; every feature ships with its own tests.
