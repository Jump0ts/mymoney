# MyMoney

App de finanzas personales y familiares — registro de gastos e ingresos, categorización, filtros y gráficos. iOS, Android y Web desde una única base de código (Expo), con backend self-hosted.

Ver [CLAUDE.md](./CLAUDE.md) para el contexto completo del proyecto, stack técnico y flujo de ramas.

## Estructura

```
apps/mobile/   App Expo (iOS, Android, Web)
backend/       API Node.js + Prisma + PostgreSQL
```

## Flujo de ramas

`master` (producción) ← `release/x.y.z` ← `pre` ← `feature/*` ← `develop`

Ver el detalle completo en [CLAUDE.md](./CLAUDE.md#flujo-de-ramas-git).
