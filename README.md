# MyMoney

[![CI](https://github.com/Jump0ts/mymoney/actions/workflows/ci.yml/badge.svg)](https://github.com/Jump0ts/mymoney/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Aplicación de **finanzas personales**: registro de gastos e ingresos, categorías, filtros, gráficos y un **presupuesto mensual al estilo de una hoja de cálculo**. Una sola base de código para iOS, Android y Web (Expo) con un backend propio.

> **In English:** a personal-finance app (React Native + Expo for iOS/Android/Web, Node/Express/Prisma/PostgreSQL backend) with expense/income tracking, charts and an Excel-style monthly budget (recurring template, per-group limits, a "whatever is left" group). Built solo as a personal tool, with per-user data isolation, automated tests and a hardened deployment pipeline. Status: **beta**.

Es una herramienta personal: no se va a comercializar y cada cuenta es **individual y privada** (nadie comparte datos con nadie).

## Qué hace

- **Movimientos**: gastos e ingresos con categoría, edición, borrado y paginación; filtros por tipo, categoría y mes.
- **Resumen**: totales del mes y gráficos (donut por categoría y barras mensuales), con selector de mes.
- **Presupuesto** (como un Excel):
  - Grupos con color (Hogar, Alquiler, Deseos…) y líneas con importe, con check de *pagado*.
  - Una **plantilla recurrente** que se copia sola a cada mes nuevo; también líneas puntuales solo de un mes.
  - Sueldo del mes, *total a gastar* (previsto y real) y *resto*.
  - **Límite opcional por grupo** con una barra de cuánto llevas ("Quedan X €" / "Te pasas X €").
  - Un grupo que **recibe lo que sobra del sueldo** (caprichos, imprevistos) y calcula su disponible.
  - Reembolsos como líneas negativas y reordenación de grupos y líneas.
- **Accesibilidad y diseño**: lectores de pantalla, tamaño de texto, *reduce motion*, contraste AA y modo claro/oscuro.

## Stack

| Capa | Tecnología |
|---|---|
| App | React Native + Expo (Expo Router), TypeScript, React Query, React Hook Form + Yup, Reanimated |
| Backend | Node.js, Express, Prisma ORM, PostgreSQL, Zod, JWT, Helmet |
| Pruebas | Jest + React Native Testing Library (app), Vitest + supertest contra PostgreSQL real (backend), tests de shell con `docker` simulado (despliegue) |
| CI/CD | GitHub Actions: lint, typecheck, build, tests con cobertura, construcción y arranque de la imagen Docker, `shellcheck` |
| Despliegue | Docker, nginx + Let's Encrypt, GHCR, DigitalOcean; la web en Cloudflare Pages |

## Decisiones de diseño que merecen mención

- **Aislamiento por usuario como invariante**: cada consulta del backend filtra por el usuario autenticado y hay tests que comprueban que un usuario no puede ver ni tocar datos de otro.
- **Organización por dominio** (`transactions`, `categories`, `budgets`…), cada uno con sus rutas, esquemas de validación y tipos; nada compartido se duplica.
- **Presupuesto mensual generado de forma perezosa**: el mes se crea al abrirlo copiando la plantilla, de forma idempotente y tolerando peticiones simultáneas.
- **Seguridad del despliegue** (ver [`deploy/vps/README.md`](./deploy/vps/README.md)): imagen sin root y con sistema de ficheros de solo lectura, base de datos sin puertos publicados, despliegue por *digest* con la procedencia de la imagen verificada, clave SSH de CI con comando forzado, política de seguridad de contenido (CSP) estricta en la web y backups verificados que se restauran en pruebas.
- **Cuentas cerradas en producción**: el registro público se puede desactivar con una variable de entorno.

## Estructura

```
apps/mobile/   App Expo (iOS, Android y Web)
backend/       API Node.js + Prisma + PostgreSQL
deploy/        Despliegue (servidor doméstico y VPS), backups y su documentación
```

Más contexto de arquitectura y flujo de trabajo en [CLAUDE.md](./CLAUDE.md).

## Ejecutarlo en local

Requisitos: Node 24 (ver `.nvmrc`) y PostgreSQL.

```bash
npm ci

# Backend
cp backend/.env.example backend/.env      # ajusta DATABASE_URL y JWT_SECRET
npm run prisma:deploy --workspace=backend # aplica las migraciones
npm run prisma:seed --workspace=backend   # (opcional) usuario demo: demo@mymoney.local / demo12345
npm run backend:dev                       # http://localhost:4000

# App (web, iOS o Android con Expo)
npm run mobile:dev                        # la web usa EXPO_PUBLIC_API_URL (por defecto http://localhost:4000)
```

> **Ojo con los tests del backend**: vacían las tablas de la base indicada en `DATABASE_URL`. Usa una base distinta a la de desarrollo (por ejemplo `mymoney_test`).

```bash
npm run test --workspace=backend    # Vitest + PostgreSQL
npm run test --workspace=apps/mobile
npm run lint --workspace=backend && npm run lint --workspace=apps/mobile
```

## Estado

Versión **beta** de uso personal: las funciones principales están completas y probadas; faltan detección automática de pagos (Android), cuentas/carteras múltiples y gastos recurrentes fuera del presupuesto.

## Licencia

[MIT](./LICENSE) © 2026 Jose Antonio Fernández Salado
