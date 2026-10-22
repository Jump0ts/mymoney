# MyMoney en el VPS de DigitalOcean

Backend + base de datos de producción en el droplet que ya aloja `travel_agency`; la web en Cloudflare Pages.
Esta carpeta es todo lo necesario para desplegar. **Nada de esto se ha aplicado todavía en el servidor**: los pasos
de la sección 3 marcados con 🔴 cambian infraestructura real y se hacen juntos, uno a uno, con confirmación.

```
 Móvil / Web (Cloudflare Pages)
        │ HTTPS
        ▼
 DNS (Cloudflare) ──► VPS 139.59.143.82 ── firewall DO: solo 22, 80, 443
                       ┌──────────────────────────────────────────────┐
                       │ nginx de travel_agency (dueño de 80/443)     │
                       │   travel.…       → app de travel             │
                       │   mymoney-api.…  → /api/ y /health únicamente│
                       └───────────────┬──────────────────────────────┘
                          red `travel-agency_default` (solo nginx ↔ api)
                       ┌───────────────▼──────────────┐   red `internal` (sin Internet)
                       │ api (Node, sin root, 200 MB) ├──────────► db (Postgres, sin puertos publicados)
                       └──────────────────────────────┘
```

## 1. Principios de seguridad

| Qué | Cómo |
|---|---|
| Secretos | Solo en `~/mymoney/.env.production` **en el servidor** (modo 600), generados allí y nunca mostrados. En GitHub solo hay una clave SSH de despliegue (secret) y datos no sensibles (variables). Nada va al repo: `.gitignore` bloquea `.env.*` (salvo `*.example`), `*.pem`, `*.key` y `*.sql.gz`. |
| Exposición | Solo se publica `https://mymoney-api…/api/*` y `/health`. La base de datos no publica ningún puerto y vive en una red sin salida a Internet. Cualquier otra ruta da 404. |
| Registro | `REGISTRATION_ENABLED=false`: nadie más puede crear cuentas. Se abre solo el rato necesario para crear la tuya. |
| Fuerza bruta | nginx limita `/api/auth/` a 10 intentos/min por IP (429) y `/api/` a 10 req/s. |
| CORS | Solo el origen exacto de la web (`CORS_ORIGINS`, sin comodines; el despliegue lo valida). |
| Contenedores | API sin root, sistema de ficheros de solo lectura, sin capabilities, `no-new-privileges`, 200 MB. Imagen construida desde el `package-lock.json`. |
| Cadena de suministro | Acciones de GitHub fijadas por commit SHA; imagen por **digest** con *attestation* verificada antes de desplegar; GHCR privado. |
| Clave SSH de CI | Clave propia, con `restrict` y un **comando forzado**: solo puede pedir `deploy <digest> <usuario>` (el token de GHCR viaja por stdin y se cierra la sesión del registro nada más descargar). No da shell, túneles ni scp. El repositorio de imágenes está fijado en el servidor. |
| Aprobación | El despliegue es **solo manual** (`workflow_dispatch`) y **solo desde `master`**: lanzarlo es tu aprobación, nunca se despliega solo al hacer push. El entorno `production` además solo admite la rama `master`. (El plan de GitHub no ofrece *Required reviewers* en repos privados; si lo tuviera, añádelos como segunda llave.) |
| Web | Cabeceras de Cloudflare Pages generadas en el build: CSP sin `unsafe-inline`/`unsafe-eval` en scripts (hash por script), solo puede conectar con la API, HSTS, sin iframes, sin referrer. |
| Datos | Backups con permisos 600/700, hechos antes de cada migración, descargados a tu PC con verificación SHA-256. |

## 2. Qué vive dónde (servidor, usuario `deploy`)

El usuario `deploy` no tiene `sudo`, así que todo vive en su home (modo 750):

```
~/mymoney/
  .env.production     secretos (600). NUNCA se sobrescribe ni sale del servidor
  bin/ssh-entry.sh    comando forzado de la clave de CI (555). Lo instalas tú una vez; no lo toca la CI
  release/            ficheros de despliegue extraídos de cada imagen verificada (compose, deploy.sh, nginx, backups)
  state/              imagen actual/anterior (current, previous, image.env)
  backups/            volcados diarios/semanales
/opt/travel-agency/nginx/conf.d/zz-mymoney-api.conf   vhost (se añade; no se toca nada de travel)
```

## 3. Puesta en marcha (una sola vez)

Orden recomendado. 🔴 = cambia infraestructura real.

**3.1 🔴 DNS (Cloudflare).** Registros `A` y `AAAA` de `mymoney-api` hacia la IP/IPv6 del droplet (los mismos que
`travel`), en modo **solo DNS** (nube gris), igual que travel. La web irá en otro nombre (3.8).

**3.2 En tu PC: clave SSH de despliegue (nueva, solo para esto).**

```powershell
ssh-keygen -t ed25519 -N '""' -C mymoney-ci -f $env:USERPROFILE\.ssh\mymoney_deploy_ci
```
La clave privada se pega en el secret de GitHub (3.5) y después se guarda en tu gestor de contraseñas o se borra del PC.

**3.3 🔴 Servidor: carpeta y secretos.** Los secretos se escriben directamente en el fichero, sin pasar por pantalla ni por historial:

```bash
ssh -i ~/.ssh/do_travel_agency deploy@139.59.143.82
umask 077
mkdir -p ~/mymoney/bin ~/mymoney/state ~/mymoney/backups
{
  echo "DOMAIN=mymoney-api.josanfersal.dev"
  echo "POSTGRES_USER=mymoney"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  echo "POSTGRES_DB=mymoney_production"
  echo "JWT_SECRET=$(openssl rand -hex 48)"
  echo "CORS_ORIGINS=https://mymoney.josanfersal.dev"
  echo "REGISTRATION_ENABLED=true"      # temporal: hasta crear tu cuenta (3.7)
} > ~/mymoney/.env.production
chmod 600 ~/mymoney/.env.production
```
Guarda `POSTGRES_PASSWORD` y `JWT_SECRET` en tu gestor de contraseñas **leyéndolos tú** del fichero en el servidor
(`less ~/mymoney/.env.production`), no en este chat. Perder el `JWT_SECRET` solo cierra las sesiones.

**3.4 🔴 Servidor: comando forzado de la clave de CI.**

```bash
# Desde tu PC (clave de administración): copia el script y fíjalo en solo lectura
scp -i ~/.ssh/do_travel_agency deploy/vps/bin/ssh-entry.sh deploy@139.59.143.82:~/mymoney/bin/ssh-entry.sh
ssh -i ~/.ssh/do_travel_agency deploy@139.59.143.82 'chmod 555 ~/mymoney/bin/ssh-entry.sh'

# En el servidor: añade la clave pública de CI con restricciones (una sola línea)
echo 'restrict,command="/home/deploy/mymoney/bin/ssh-entry.sh" <contenido de mymoney_deploy_ci.pub>' >> ~/.ssh/authorized_keys
```
Comprueba que la clave **no** da shell: `ssh -i ~/.ssh/mymoney_deploy_ci deploy@139.59.143.82 id` debe responder `ssh-entry: orden no permitida`.

**3.5 GitHub.** *Settings → Environments → New → `production`*, con *Deployment branches* limitado a `master`.
En ese entorno:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | clave **privada** `mymoney_deploy_ci` |
| Variable | `DEPLOY_HOST` | `139.59.143.82` |
| Variable | `DEPLOY_USER` | `deploy` |
| Variable | `DEPLOY_KNOWN_HOSTS` | salida de `ssh-keyscan -t ed25519 139.59.143.82`, **tras comprobar la huella** `SHA256:Comn+KcaSl0+Rby9Kl1xqAVR4fB8DaBamWeXPaTjbFE` (en el servidor: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) |
| Variable | `API_DOMAIN` | `mymoney-api.josanfersal.dev` |

**3.6 🔴 Primer despliegue y certificado.** El workflow solo existe para GitHub cuando está en `master`, así que antes hay que llevar
estos cambios a `master` (PR de release). Entonces ejecuta *Actions → Deploy API → Run workflow* sobre `master`. La primera vez termina en rojo en la comprobación final (aún no hay HTTPS): es lo esperado. Entonces:

```bash
cd ~/mymoney/release && DOMAIN=mymoney-api.josanfersal.dev ./bootstrap-cert.sh
curl -fsS https://mymoney-api.josanfersal.dev/health
```
Desde ahí el certificado lo renueva solo el certbot de travel. Si `nginx -t` rechaza algo, `nginx-apply.sh` restaura la
configuración anterior y **no recarga**: travel no se ve afectado.

**3.7 Tu cuenta y cierre del registro.** Crea tu usuario desde la app, y cierra el registro:

```bash
sed -i 's/^REGISTRATION_ENABLED=.*/REGISTRATION_ENABLED=false/' ~/mymoney/.env.production
cd ~/mymoney/release && ./deploy.sh "$(cat ../state/current)"
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mymoney-api.josanfersal.dev/api/auth/register \
  -H 'Content-Type: application/json' -d '{}'     # 403
```

**3.8 Web en Cloudflare Pages** (sin tokens en GitHub: se conecta desde el panel de Cloudflare).
*Workers & Pages → Create → Pages → Connect to Git* → este repo:

| Ajuste | Valor |
|---|---|
| Production branch | `master` |
| Build command | `npm ci && npm run build:web --workspace=apps/mobile` |
| Build output directory | `apps/mobile/dist` |
| Variables (Production) | `NODE_VERSION=24`, `EXPO_PUBLIC_API_URL=https://mymoney-api.josanfersal.dev`, `EXPO_PUBLIC_APP_ENV=production` |
| Preview deployments | **Desactivados** (no hay API para ellas y expondrían builds sin revisar) |
| Dominio personalizado | `mymoney.josanfersal.dev` (debe coincidir con `CORS_ORIGINS`) |

El build escribe `dist/_headers` con la CSP calculada (`apps/mobile/scripts/web-headers.js`). Si cambias el dominio de la API
solo hay que cambiar `EXPO_PUBLIC_API_URL`.

**3.9 🔴 Backups.** En el servidor (cron del usuario `deploy`):

```bash
crontab -e
15 3 * * * BACKUP_DIR=$HOME/mymoney/backups ENV_FILE=$HOME/mymoney/.env.production COMPOSE_FILE=$HOME/mymoney/release/docker-compose.yml $HOME/mymoney/release/backup/backup.sh production >> $HOME/mymoney-backup.log 2>&1
```
En tu PC, alias y descarga programada (ver [../BACKUP.md](../BACKUP.md)):

```
# ~/.ssh/config
Host mymoney-vps
  HostName 139.59.143.82
  User deploy
  IdentityFile ~/.ssh/do_travel_agency
  IdentitiesOnly yes
  StrictHostKeyChecking yes
```
```powershell
powershell -File deploy\backup\pull-backups.ps1 -Server mymoney-vps -RemoteRoot /home/deploy/mymoney/backups
```
Limitación conocida: esta descarga usa la clave de administración (da shell como `deploy`). Está en tu PC; protege el disco con BitLocker.

**3.10 Monitorización.** Añade a DigitalOcean (Uptime) la comprobación `https://mymoney-api.josanfersal.dev/health`. La alerta de memoria al 85 % de travel
ya cubre el droplet: si salta de forma repetida, sube a 2 GB.

## 4. Operación

```bash
# Estado y logs (sin secretos)
docker ps --filter name=mymoney-prod --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 50 mymoney-prod-api-1

# Volver a la versión anterior: Actions → Deploy API → Run workflow → image_tag = sha-xxxxxxx (es manual por diseño)
# Aplicar cambios del .env.production sin cambiar de imagen:
cd ~/mymoney/release && ./deploy.sh "$(cat ../state/current)"
# Rotar JWT_SECRET (cierra todas las sesiones): editar el fichero y repetir la línea anterior.
```
Un despliegue hace, en este orden: comprobar configuración → backup → migrar → arrancar la API nueva → nginx. Si la API nueva no queda
sana, vuelve sola a la anterior. Las migraciones solo avanzan: escríbelas compatibles con la versión anterior de la API.

## 5. Riesgos aceptados y límites

- **nginx compartido**: un error de nginx afecta también a travel. Por eso el vhost se valida con `nginx -t` y se revierte, la API se resuelve en cada petición (si MyMoney está parado solo él da 502) y el fichero carga después de `site.conf` de travel (sigue siendo su servidor por defecto).
- **Mismo droplet**: un fallo de MyMoney (memoria) puede afectar a travel. Límites de memoria en ambos contenedores y alerta al 85 %.
- **Grupo `docker`**: el usuario `deploy` equivale a root en la máquina. Por eso la clave de CI tiene comando forzado y la de administración no sale de tu PC.
- La imagen lleva dentro los ficheros de despliegue (sin secretos): el servidor solo ejecuta lo que sale de tu CI y se verifica por digest.
- No hay cifrado de los backups en el servidor (contienen lo mismo que la base viva); sí en tu PC por BitLocker.

## 6. Pruebas

```bash
bash deploy/vps/vps.test.sh      # comando forzado, nginx-apply y deploy.sh con docker/stat simulados
bash deploy/backup/backup.test.sh
```
La CI además construye la imagen, la arranca con las mismas restricciones que producción y comprueba salud, usuario sin root, registro cerrado (403) y 401 sin token.
