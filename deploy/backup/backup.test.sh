#!/usr/bin/env bash
# Pruebas de backup.sh con un `docker` falso (no necesita Docker ni Postgres).
# Uso: bash deploy/backup/backup.test.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/bin"
cat >"$WORK/bin/docker" <<'EOF'
#!/usr/bin/env bash
case "${FAKE_DOCKER_MODE:-ok}" in
  ok) printf -- '--\n-- PostgreSQL database dump\n--\nCREATE TABLE "User" (id text);\n' ;;
  empty) ;;
  garbage) echo "esto no es un volcado" ;;
  fail) echo "boom" >&2; exit 1 ;;
  truncated) printf -- '--\n-- PostgreSQL database dump\n--\nCREATE TABLE "User" (id'; echo "boom" >&2; exit 1 ;;
esac
EOF
chmod +x "$WORK/bin/docker"
export PATH="$WORK/bin:$PATH"

PASSED=0
fail() { echo "FALLO: $*" >&2; exit 1; }
pass() { PASSED=$((PASSED + 1)); echo "ok - $1"; }
count() { find "$1" -type f 2>/dev/null | wc -l | tr -d ' '; }

run_backup() { # <modo> <dir> [entorno]
  FAKE_DOCKER_MODE="$1" BACKUP_DIR="$2" bash "$HERE/backup.sh" "${3:-production}" >/dev/null 2>&1
}

# 1. Caso normal: un fichero valido, sin restos .partial
D="$WORK/t1"
run_backup ok "$D" || fail "el backup normal deberia salir con 0"
[ "$(count "$D/production/daily")" = "1" ] || fail "deberia haber exactamente 1 backup diario"
F="$(find "$D/production/daily" -type f)"
gzip -t "$F" || fail "el backup no es un gzip valido"
gunzip -c "$F" | grep -q 'CREATE TABLE "User"' || fail "el backup no contiene el volcado"
[ -z "$(find "$D" -name '*.partial')" ] || fail "quedo un .partial"
pass "genera un backup valido y no deja restos"

# 2. Si pg_dump falla no se guarda nada y el script sale con error
for MODE in fail empty garbage truncated; do
  D="$WORK/t2-$MODE"
  if run_backup "$MODE" "$D"; then fail "con modo $MODE deberia salir con error"; fi
  [ "$(count "$D/production/daily")" = "0" ] || fail "con modo $MODE no deberia guardarse nada"
done
pass "un volcado fallido, vacio, invalido o truncado a mitad no cuenta como backup"

# 3. Copia semanal solo en domingo
D="$WORK/t3"
BACKUP_WEEKDAY=3 run_backup ok "$D"
[ "$(count "$D/production/weekly")" = "0" ] || fail "no deberia haber copia semanal entre semana"
BACKUP_WEEKDAY=7 run_backup ok "$D"
[ "$(count "$D/production/weekly")" = "1" ] || fail "deberia haber copia semanal en domingo"
pass "la copia semanal se hace solo en domingo"

# 4. Retencion: borra lo antiguo, conserva lo reciente
D="$WORK/t4"
mkdir -p "$D/production/daily" "$D/production/weekly"
touch -d '20 days ago' "$D/production/daily/mymoney-production-viejo.sql.gz"
touch -d '3 days ago' "$D/production/daily/mymoney-production-reciente.sql.gz"
touch -d '70 days ago' "$D/production/weekly/mymoney-production-viejo.sql.gz"
touch -d '30 days ago' "$D/production/weekly/mymoney-production-reciente.sql.gz"
run_backup ok "$D"
[ ! -e "$D/production/daily/mymoney-production-viejo.sql.gz" ] || fail "el diario antiguo deberia borrarse"
[ -e "$D/production/daily/mymoney-production-reciente.sql.gz" ] || fail "el diario reciente deberia conservarse"
[ ! -e "$D/production/weekly/mymoney-production-viejo.sql.gz" ] || fail "el semanal antiguo deberia borrarse"
[ -e "$D/production/weekly/mymoney-production-reciente.sql.gz" ] || fail "el semanal reciente deberia conservarse"
pass "la retencion borra lo antiguo y conserva lo reciente"

# 5. Entorno desconocido
if run_backup ok "$WORK/t5" produccion; then fail "un entorno desconocido deberia fallar"; fi
pass "rechaza un entorno desconocido"

echo "$PASSED pruebas correctas"
