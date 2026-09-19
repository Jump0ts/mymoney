# MyMoney — contexto del proyecto

App de finanzas personales: registro de gastos e ingresos, categorización, filtros y gráficos.

**Modelo de datos: cuentas 100% individuales y privadas.** No existe ningún concepto de "familia" ni de grupo que comparta datos — cada usuario ve únicamente sus propias categorías y movimientos, sin excepción. Esto es intencional y central al diseño: el objetivo a largo plazo es poder **comercializar la app** (SaaS), por lo que el aislamiento estricto de datos por usuario es un requisito de producto, no solo técnico.

Fase actual: uso privado del propio autor + un grupo cerrado de amigos/familiares que actúan como **beta testers**, cada uno con su cuenta individual e independiente (no comparten nada entre sí). Sirven para validar que todo funciona bien y para recoger ideas de nuevas funcionalidades — no para compartir gastos entre ellos.

Infra actual: self-hosted en un servidor doméstico (ver más abajo), pensado para poder migrar a un hosting de verdad si el proyecto avanza hacia producto comercial.

## Stack

- **App** (iOS + Android + Web): React Native + Expo (Expo Router), TypeScript.
- **Backend**: Node.js + TypeScript + Express + Prisma ORM + PostgreSQL.
- **Auth**: JWT. Registro abierto e individual (nombre, email, contraseña) — sin grupos ni invitaciones. Cada `User` es dueño exclusivo de sus `Category` y `Transaction`.
- **Infra**: self-hosted en servidor doméstico. Nginx como reverse proxy + Let's Encrypt (Certbot) para HTTPS. DNS dinámico (`ddclient`) porque la IP de casa es dinámica. Dominio comprado en Cloudflare Registrar (DNS gestionado en Cloudflare).
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
  - **⚠️ Excepción obligatoria dentro de `apps/mobile/src/app/`**: Expo Router registra como ruta/pestaña CUALQUIER archivo dentro de una carpeta enrutada (`app/`, `app/(tabs)/`, etc.), incluso sin `export default` y **aunque esté en una subcarpeta con prefijo `_`** (comprobado en este proyecto: ni "sin default export" ni `_carpeta/` evitan que aparezca como pestaña navegable — probablemente específico de cómo `Tabs` de expo-router escanea su directorio). La única forma fiable es sacar el fichero **completamente fuera de `app/`**: los estilos de pantallas viven en `apps/mobile/src/screens/` (`screens/login.styles.ts`, `screens/tabs/index.styles.ts`, etc.), importados desde la ruta vía alias `@/screens/...`.
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
