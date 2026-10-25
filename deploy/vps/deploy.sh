#!/usr/bin/env bash
# Despliega una imagen ya descargada de MyMoney. Lo lanza bin/ssh-entry.sh (no se ejecuta a mano salvo
# para un rollback; ver README.md).  Uso: deploy.sh ghcr.io/<repo>@sha256:<digest>
#
# Orden de seguridad: comprobar configuracion -> backup -> migrar -> reemplazar la API -> web -> nginx.
# Si la API nueva no queda sana se vuelve a la imagen anterior. Nunca se imprimen secretos.
# La web (opcional, si hay WEB_DOMAIN) sale de la misma imagen: se sirve desde el contenedor `web`.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
RELEASE_DIR="$PWD"
BASE="${MYMONEY_BASE:-$(cd .. && pwd)}"
ENV_FILE="$BASE/.env.production"
STATE="$BASE/state"
EDGE_NETWORK="${EDGE_NETWORK:-travel-agency_default}"

die() { echo "deploy: $*" >&2; exit 1; }
log() { echo "==> $*"; }

IMAGE_REF="${1:?Uso: deploy.sh <imagen@sha256:digest>}"
[[ "$IMAGE_REF" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]] || die "referencia de imagen no valida"

# ---- 1. Configuracion: debe existir, ser privada y estar completa (solo se comprueba, no se muestra) ----
[ -f "$ENV_FILE" ] || die "falta $ENV_FILE (ver README.md)"
[ "$(stat -c %a "$ENV_FILE")" = "600" ] || die "$ENV_FILE debe tener permisos 600"

env_value() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true; }

for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB JWT_SECRET CORS_ORIGINS DOMAIN; do
  [ -n "$(env_value "$var")" ] || die "falta $var en $ENV_FILE"
done
[[ "$(env_value POSTGRES_PASSWORD)" =~ ^[A-Za-z0-9]{24,}$ ]] \
  || die "POSTGRES_PASSWORD debe ser alfanumerica de 24+ caracteres (va dentro de una URL)"
JWT_SECRET_VALUE="$(env_value JWT_SECRET)"
[ "${#JWT_SECRET_VALUE}" -ge 32 ] || die "JWT_SECRET debe tener al menos 32 caracteres"
unset JWT_SECRET_VALUE
[[ "$(env_value CORS_ORIGINS)" =~ ^https://[a-z0-9.,:/-]+$ ]] \
  || die "CORS_ORIGINS debe ser una lista de origenes https exactos (sin comodines)"
DOMAIN="$(env_value DOMAIN)"
DOMAIN_REGEX='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
[[ "$DOMAIN" =~ $DOMAIN_REGEX ]] || die "DOMAIN no es un dominio valido"

# La web en este VPS es opcional: solo si WEB_DOMAIN esta definido.
WEB_DOMAIN="$(env_value WEB_DOMAIN)"
if [ -n "$WEB_DOMAIN" ]; then
  [[ "$WEB_DOMAIN" =~ $DOMAIN_REGEX ]] || die "WEB_DOMAIN no es un dominio valido"
  [ "$WEB_DOMAIN" != "$DOMAIN" ] || die "WEB_DOMAIN y DOMAIN deben ser dominios distintos"
  # El origen de la web es el unico que la API acepta (CORS): si no coincide, la web cargaria pero no podria entrar.
  case ",$(env_value CORS_ORIGINS)," in
    *",https://$WEB_DOMAIN,"*) ;;
    *) die "CORS_ORIGINS debe incluir https://$WEB_DOMAIN (el origen de la web)" ;;
  esac
  { [ -f "$RELEASE_DIR/web/index.html" ] && [ -f "$RELEASE_DIR/web-nginx/nginx.conf" ]; } \
    || die "la imagen no lleva la web (faltan web/index.html o web-nginx/nginx.conf)"
fi

docker network inspect "$EDGE_NETWORK" >/dev/null 2>&1 \
  || die "no existe la red $EDGE_NETWORK: travel_agency (que lleva el nginx) debe estar desplegado"

mkdir -p "$STATE" "$BASE/backups"
chmod 700 "$STATE" "$BASE/backups"

dc() {
  docker compose -p mymoney-prod --env-file "$ENV_FILE" --env-file "$STATE/image.env" \
    -f "$RELEASE_DIR/docker-compose.yml" "$@"
}
set_image() { printf 'API_IMAGE=%s\n' "$1" >"$STATE/image.env.tmp" && mv "$STATE/image.env.tmp" "$STATE/image.env"; }

PREVIOUS="$(cat "$STATE/current" 2>/dev/null || true)"
[ -f "$STATE/image.env" ] || set_image "${PREVIOUS:-mymoney-api-sin-desplegar}"

# ---- 2. Backup antes de tocar nada (si la base ya existe) ----
if [ -n "$(dc ps -q db 2>/dev/null)" ]; then
  log "Backup previo a la migracion"
  ENV_FILE="$ENV_FILE" COMPOSE_FILE="$RELEASE_DIR/docker-compose.yml" BACKUP_DIR="$BASE/backups" \
    "$RELEASE_DIR/backup/backup.sh" production || die "el backup fallo: no se despliega sin copia"
fi

# ---- 3. Base de datos y migraciones ----
set_image "$IMAGE_REF"
log "Levantando la base de datos"
dc up -d --wait --wait-timeout 90 db
log "Aplicando migraciones"
dc run --rm -T --no-deps api npx --no-install prisma migrate deploy

# ---- 4. Reemplazo de la API, con vuelta atras si no queda sana ----
log "Arrancando la API nueva"
if ! dc up -d --no-deps --wait --wait-timeout 90 api; then
  echo "deploy: la API nueva no quedo sana" >&2
  dc logs --tail 40 api >&2 || true
  if [ -n "$PREVIOUS" ]; then
    log "Volviendo a la imagen anterior"
    set_image "$PREVIOUS"
    dc up -d --no-deps --wait --wait-timeout 90 api || true
  fi
  exit 1
fi
printf '%s\n' "$IMAGE_REF" >"$STATE/current"
[ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$IMAGE_REF" ] && printf '%s\n' "$PREVIOUS" >"$STATE/previous"

# ---- 5. La web (si procede): se recrea siempre para que sirva los ficheros de la imagen nueva ----
# Un fallo aqui no deshace la API (ya esta sana y marcada como actual) pero si hace fallar el despliegue.
if [ -n "$WEB_DOMAIN" ]; then
  log "Arrancando la web"
  if ! dc up -d --no-deps --force-recreate --wait --wait-timeout 60 web; then
    echo "deploy: la web no quedo sana" >&2
    dc logs --tail 40 web >&2 || true
    exit 1
  fi
fi

# ---- 6. nginx (idempotente y con vuelta atras propia) ----
log "Configurando nginx"
DOMAIN="$DOMAIN" WEB_DOMAIN="$WEB_DOMAIN" "$RELEASE_DIR/nginx-apply.sh"

docker image prune -f >/dev/null
log "Desplegado: $IMAGE_REF"
