# MyMoney — contexto del proyecto

App de finanzas personales: registro de gastos e ingresos, categorización, filtros y gráficos.

**Alcance del proyecto: herramienta personal del autor.** MyMoney **no** se va a comercializar (decisión del 2026-10-13): no hay plan de SaaS, precios ni captación de usuarios, y no se deben proponer funcionalidades pensadas para monetizar o escalar a terceros. Si algún día hace falta algo compartido o multiusuario, será un **proyecto aparte** con su propio modelo de datos, no una extensión de este.

**Modelo de datos: cuentas individuales y privadas.** No existe ningún concepto de "familia" ni de grupo que comparta datos — cada usuario ve únicamente sus propias categorías y movimientos, sin excepción. Se mantiene por diseño y por privacidad: simplifica el modelo y evita exponer datos financieros ajenos.

Fase actual: uso personal del autor. Puede haber cuentas de prueba de amigos/familiares de la fase anterior (cada una individual e independiente), pero ya no es un objetivo del proyecto.

Infra: **producción irá en el VPS de DigitalOcean que ya aloja `travel_agency`** (decisión del 2026-10-22; backend + Postgres en ese droplet de 1 GB, web en Cloudflare Pages). El servidor doméstico se queda para `pre`/`staging`. Todo el despliegue y su modelo de seguridad están en `deploy/vps/README.md`. Reglas fijas: ningún secreto en el repo ni en el chat (se generan y quedan solo en el servidor), la base de datos nunca publica puertos, y los cambios en el servidor, DNS o certificados se confirman con el usuario antes.

## Stack

- **App** (iOS + Android + Web): React Native + Expo (Expo Router), TypeScript.
- **Backend**: Node.js + TypeScript + Express + Prisma ORM + PostgreSQL.
- **Auth**: JWT. Registro abierto e individual (nombre, email, contraseña) — sin grupos ni invitaciones. Cada `User` es dueño exclusivo de sus `Category` y `Transaction`.
- **Infra**: producción en el VPS de DigitalOcean compartido con `travel_agency` (nginx + certbot de travel como único dueño de 80/443; API y Postgres en contenedores; imagen construida en CI y desplegada por digest vía GHCR + SSH con clave restringida). `pre`/`staging` en el servidor doméstico (Nginx + Certbot, DNS dinámico con `ddclient`). Dominio comprado en Cloudflare Registrar (DNS gestionado en Cloudflare). Web en Cloudflare Pages.
- **Distribución móvil de pruebas**: Expo Go (gratis) para desarrollo iterativo. Android: APK interno vía EAS Build. iOS: de momento sin cuenta de Apple Developer de pago (se evaluará más adelante si hace falta TestFlight/App Store).
- **NFC / detección automática de pago**: solo Android (Notification Listener Service). En iOS no es posible por restricción de la plataforma (Apple no expone eventos de Apple Pay a apps de terceros) — alternativa: widget/atajo de acceso rápido de un toque.

## Arquitectura de código (obligatoria para todo dato nuevo)

Organización **por dominio/tipo de dato** (gastos, categorías, presupuestos, etc. — cada uno es su propio dominio, completamente separado de los demás):

- **Backend** (`backend/src/modules/<dominio>/`): cada dominio tiene su propia carpeta con `*.routes.ts`, `*.schema.ts` (validación con **Zod**), `*.types.ts` y `*.utils.ts` si hace falta. Ejemplo: `modules/transactions/transactions.schema.ts`.
- **App** (`apps/mobile/src/features/<dominio>/`): cada dominio tiene su propia carpeta con `*.types.ts`, `*.constants.ts`, `*.schema.ts` (validación con **Yup**), y sus hooks (`useX.ts`). El store de auth vive en `features/auth/auth.store.ts`.
- **Regla de propiedad compartida**: si un tipo/constante lo necesitan dos dominios (ej. `TransactionType`, que usan tanto `categories` como `transactions`), vive en el dominio "dueño" del concepto (en ese caso, `transactions`) y el resto lo importa desde ahí. Nunca se duplica.
- **Utils verdaderamente genéricos** (usados por 2+ dominios, ej. `formatMoney`): van en `apps/mobile/src/utils/` (no dentro de ningún dominio). Backend: `backend/src/utils/` (solo lo genérico: `asyncHandler`, `errors`).
- **Formularios**: React Hook Form + Yup en la app. Cada dominio define su propio schema de Yup en `<dominio>/<dominio>.schema.ts`.
- **Estilos**: siempre en un archivo `NombreDelArchivo.styles.ts` separado (React Native no tiene CSS real; se usa `StyleSheet.create`), nunca inline al final del componente/pantalla. Excepción razonable: un objeto de estilo dinámico trivial de una sola línea no necesita archivo propio.
  - **⚠️ Excepción obligatoria dentro de `apps/mobile/src/app/`**: Expo Router registra como ruta/pestaña CUALQUIER archivo dentro de una carpeta enrutada (`app/`, `app/(tabs)/`, etc.), incluso sin `export default` y **aunque esté en una subcarpeta con prefijo `_`** (comprobado en este proyecto: ni "sin default export" ni `_carpeta/` evitan que aparezca como pestaña navegable — probablemente específico de cómo `Tabs` de expo-router escanea su directorio). La única forma fiable es sacar el fichero **completamente fuera de `app/`**: los estilos de pantallas viven en `apps/mobile/src/screens/` (`screens/login.styles.ts`, `screens/tabs/index.styles.ts`, etc.), importados desde la ruta vía alias `@/screens/...`. **Lo mismo vale para los tests**: un `*.test.tsx` dentro de `app/` rompe el bundle real de la app (`jest is not defined`), así que ahí no se colocan tests; la lógica que haya que probar se extrae a `features/`, `hooks/` o `components/`.
- **Funciones**: arrow functions por defecto en todo el código (`const fn = () => {}`), tanto en componentes como en utils/hooks/rutas. Solo usar `function` si hay una razón técnica concreta para ello. **No hay regla de ESLint que lo fuerce** (decisión explícita del usuario, para no bloquear casos legítimos) — es una convención a seguir manualmente.

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
- **Ninguna funcionalidad nueva debe introducir datos compartidos entre usuarios** (grupos, familias, workspaces, etc.) sin que el usuario lo pida explícitamente. El aislamiento por usuario es un invariante del producto.
