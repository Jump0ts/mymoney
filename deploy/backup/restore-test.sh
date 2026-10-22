#!/usr/bin/env bash
# Comprueba que el ultimo backup se puede restaurar de verdad: lo carga en un
# Postgres desechable (no toca la base real) y compara el numero de filas.
# Un backup que nunca se ha restaurado no es un backup. Ejecutalo una vez al mes.
# Uso: ./restore-test.sh [production|pre|staging]   (por defecto: production)
set -euo pipefail

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
TABLES=("User" "Category" "Transaction")

LATEST="$(find "$BACKUP_ROOT/daily" -name 'mymoney-*.sql.gz' 2>/dev/null | sort | tail -n 1)"
if [ -z "$LATEST" ]; then
  echo "No hay backups en $BACKUP_ROOT/daily" >&2
  exit 1
fi
echo "Restaurando $LATEST en un Postgres desechable..."

CONTAINER="mymoney-restore-test-$$"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=restore-test -e POSTGRES_DB=restore_test \
  postgres:16-alpine >/dev/null

# La imagen arranca un servidor temporal para inicializar y luego lo reinicia:
# el mensaje "ready to accept connections" sale dos veces y solo la segunda es la buena.
for i in $(seq 1 60); do
  READY="$(docker logs "$CONTAINER" 2>&1 | grep -c "ready to accept connections" || true)"
  [ "$READY" -ge 2 ] && break
  [ "$i" = "60" ] && { echo "El Postgres desechable no arranco a tiempo" >&2; exit 1; }
  sleep 1
done

gunzip -c "$LATEST" | docker exec -i "$CONTAINER" psql -U postgres -d restore_test -v ON_ERROR_STOP=1 -q >/dev/null

restored_count() {
  docker exec "$CONTAINER" psql -U postgres -d restore_test -tAc "SELECT count(*) FROM \"$1\""
}
live_count() {
  docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" \
    -f "$COMPOSE_FILE" exec -T db \
    sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc 'SELECT count(*) FROM \"$1\"'"
}

STATUS=0
printf '%-14s %10s %10s\n' "Tabla" "Restaurado" "Real"
for TABLE in "${TABLES[@]}"; do
  RESTORED="$(restored_count "$TABLE")"
  LIVE="$(live_count "$TABLE")"
  printf '%-14s %10s %10s\n' "$TABLE" "$RESTORED" "$LIVE"
  # Pueden diferir por filas creadas despues del backup, pero un backup con 0 filas
  # de una tabla que en la base real tiene datos esta vacio o roto.
  if [ "$RESTORED" = "0" ] && [ "$LIVE" != "0" ]; then
    echo "ERROR: la tabla $TABLE se restauro vacia pero la base real tiene $LIVE filas" >&2
    STATUS=1
  fi
done

if [ "$STATUS" = "0" ]; then
  echo "OK: el backup se restaura correctamente"
fi
exit "$STATUS"
