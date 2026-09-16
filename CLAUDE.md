# MyMoney — contexto del proyecto

App de finanzas personales/familiares: registro de gastos e ingresos, categorización, filtros y gráficos. Uso privado (el usuario y su familia), self-hosted en un servidor doméstico.

## Stack

- **App** (iOS + Android + Web): React Native + Expo (Expo Router), TypeScript.
- **Backend**: Node.js + TypeScript + Express + Prisma ORM + PostgreSQL.
- **Auth**: JWT, usuarios = miembros de la familia (no hay registro público).
- **Infra**: self-hosted en servidor doméstico. Nginx como reverse proxy + Let's Encrypt (Certbot) para HTTPS. DNS dinámico (`ddclient`) porque la IP de casa es dinámica. Dominio comprado en Cloudflare Registrar (DNS gestionado en Cloudflare).
- **Distribución móvil de pruebas**: Expo Go (gratis) para desarrollo iterativo. Android: APK interno vía EAS Build. iOS: de momento sin cuenta de Apple Developer de pago (se evaluará más adelante si hace falta TestFlight/App Store).
- **NFC / detección automática de pago**: solo Android (Notification Listener Service). En iOS no es posible por restricción de la plataforma (Apple no expone eventos de Apple Pay a apps de terceros) — alternativa: widget/atajo de acceso rápido de un toque.

## Alcance de la primera fase ("lo esencial")

Gastos, ingresos, categorías, filtros y gráficos. Fuera de alcance por ahora (se añadirá en fases posteriores): presupuestos por categoría, gastos recurrentes/suscripciones, múltiples cuentas/carteras, detección NFC automática.

## Flujo de ramas (Git)

| Rama | Entorno | Descripción |
|---|---|---|
| `master` | PRO | Build final que se distribuye/usa de verdad. |
| `develop` | PRE | Punto de partida de nuevas features; su contenido siempre = `master` (se sincroniza al cerrar cada fase). |
| `feature/*` | PRE | Sale de `develop`. Nueva funcionalidad o corrección. Se mergea a `pre` vía PR. |
| `pre` | PRE | Todas las features de la fase en curso, juntas, en pruebas. |
| `release/x.y.z` | INT | Se crea desde `pre` al cerrar una fase. Estabilización — el usuario la prueba unos días. Al confirmar que funciona bien, se mergea a `master` **y** a `develop`, y se da la fase por cerrada. |
| `hotfix/*` | — | Sale de `master` para arreglos urgentes en producción. Se mergea directo a `master` y a `develop`, sin pasar por `pre`/`release`. |

Reglas:
- Nunca push directo a `master`, `develop`, `pre` o `release/*` — todo vía Pull Request.
- El usuario da el OK explícito antes de mergear un PR a `pre`. No usar auto-merge salvo que lo pida expresamente.
- El front de cada entorno apunta al back del mismo entorno (pre↔pre, release/staging↔staging, prod↔prod). Cada entorno tiene su propia base de datos.
- Cuando exista más de un `apps/mobile` build en el mismo dispositivo (pre vs prod), deben poder convivir (bundle id / app name distintos por entorno vía app.config).

## CI

En cada PR: lint + typecheck + build + tests + reporte de cobertura visible en el propio PR (sin depender de servicios de pago externos).

## Convenciones de trabajo con Claude Code

- No hacer merge ni cerrar fases sin confirmación explícita del usuario.
- Antes de acciones que afecten infraestructura real (DNS, servidor doméstico, certificados) confirmar con el usuario.
- Idioma de conversación con el usuario: español.
