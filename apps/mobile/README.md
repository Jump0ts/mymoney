# MyMoney — app (Expo)

App de MyMoney para iOS, Android y Web con [Expo](https://expo.dev) y Expo Router. La descripción del proyecto, el stack y cómo
ejecutarlo todo está en el [README de la raíz](../../README.md).

## Scripts

Desde la raíz del repositorio (workspace `apps/mobile`):

| Comando | Qué hace |
|---|---|
| `npm run mobile:dev` | Arranca Expo (web, Expo Go, emuladores). |
| `npm run test --workspace=apps/mobile` | Pruebas con Jest y React Native Testing Library, con cobertura. |
| `npm run lint --workspace=apps/mobile` | ESLint. |
| `npm run typecheck --workspace=apps/mobile` | TypeScript sin emitir. |
| `npm run build:web --workspace=apps/mobile` | Exporta la web a `dist/` y genera `dist/_headers` con la política de seguridad de contenido (necesita `EXPO_PUBLIC_API_URL` con `https`). |

## Variables de entorno

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API (por defecto `http://localhost:4000`). Se incorpora al construir la web. |
| `EXPO_PUBLIC_APP_ENV` | `pre`, `staging` o `production`: cambia el nombre y el identificador de la app para poder instalar varias a la vez. |

## Estructura

```
src/app/        Rutas (Expo Router). Aquí no van estilos ni tests: se registrarían como pantallas.
src/features/   Un directorio por dominio (transactions, categories, budgets, auth…): tipos, esquemas, hooks y componentes.
src/components/ Componentes genéricos reutilizables.
src/screens/    Estilos de las pantallas (fuera de src/app a propósito).
src/utils/      Utilidades genéricas.
scripts/        Scripts de build (cabeceras de seguridad de la web).
```
