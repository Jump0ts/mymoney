#!/usr/bin/env bash
# Copia de seguridad de la base de datos de un entorno de MyMoney.
# Uso: ./backup.sh [production|pre|staging]   (por defecto: production)
#
# Genera un volcado comprimido en $BACKUP_DIR/<entorno>/daily, copia los domingos
# a weekly y borra lo que supere la retencion. Sale con codigo != 0 si algo falla.
set -euo pipefail
# Los volcados contienen las finanzas y los hashes de las contrasenas: solo legibles por su dueno.
umask 077

ENVIRONMENT="${1:-production}"
case "$ENVIRONMENT" in
  production) COMPOSE_PROJECT="mymoney-prod" ;;
  pre) COMPOSE_PROJECT="mymoney-pre" ;;
  staging) COMPOSE_PROJECT="mymoney-staging" ;;
  *)
    echo "Entorno desconocido: $ENVIRONMENT (usa production, pre o staging)" >&2
    exit 2
    ;;
esac

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Por defecto el .env y el compose viven junto a este directorio; en el VPS el .env esta fuera de release/.
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.$ENVIRONMENT}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.yml}"
BACKUP_ROOT="${BACKUP_DIR:-/var/backups/mymoney}/$ENVIRONMENT"
DAILY_KEEP_DAYS="${DAILY_KEEP_DAYS:-14}"
WEEKLY_KEEP_DAYS="${WEEKLY_KEEP_DAYS:-56}"
WEEKDAY="${BACKUP_WEEKDAY:-$(date +%u)}" # 1=lunes ... 7=domingo

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly"

FILE="$BACKUP_ROOT/daily/mymoney-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).sql.gz"
PARTIAL="$FILE.partial"
trap 'rm -f "$PARTIAL"' EXIT

# El usuario y la base de datos se leen de las variables del propio contenedor,
# asi no hay que parsear el .env (las contrasenas pueden llevar caracteres raros).
# pipefail hace que un fallo de pg_dump no quede tapado por gzip.
docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" \
  -f "$COMPOSE_FILE" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip >"$PARTIAL"

gzip -t "$PARTIAL"

# Un volcado real de pg_dump siempre empieza con esta cabecera; un fichero vacio
# o con un mensaje de error no la tiene y no debe contar como backup.
HEADER="$(gunzip -c "$PARTIAL" | head -n 20 || true)"
if ! grep -q "PostgreSQL database dump" <<<"$HEADER"; then
  echo "El volcado no parece valido (falta la cabecera de pg_dump)" >&2
  exit 1
fi

mv "$PARTIAL" "$FILE"

if [ "$WEEKDAY" = "7" ]; then
  cp -p "$FILE" "$BACKUP_ROOT/weekly/"
fi

find "$BACKUP_ROOT/daily" -name 'mymoney-*.sql.gz' -mtime +"$DAILY_KEEP_DAYS" -delete
find "$BACKUP_ROOT/weekly" -name 'mymoney-*.sql.gz' -mtime +"$WEEKLY_KEEP_DAYS" -delete

echo "OK: $FILE ($(du -h "$FILE" | cut -f1))"
